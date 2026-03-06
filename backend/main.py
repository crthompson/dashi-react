import os
import json
import asyncio
import subprocess
import httpx
from datetime import datetime, date, timedelta
from contextlib import asynccontextmanager
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Date, JSON, Text, ForeignKey, func
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from pydantic import BaseModel, Field

from config import API_KEY, DATABASE_URL, STATIC_DIR, CORS_ORIGINS

# --- Database Setup ---
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

# --- Database Models ---
class Agent(Base):
    __tablename__ = "agents"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    model = Column(String, default="")
    workspace = Column(String, default="")
    description = Column(Text, default="")
    is_default = Column(Boolean, default=False)
    assigned_skills = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text, default="")
    status = Column(String, default="unknown")
    github_url = Column(String, default="")
    fly_app_name = Column(String, default="")
    live_url = Column(String, default="")
    twilio_sid = Column(String, default="")
    last_deployed = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ChatHistory(Base):
    __tablename__ = "chat_history"
    id = Column(Integer, primary_key=True, autoincrement=True)
    agent_id = Column(String, nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

class SpendRecord(Base):
    __tablename__ = "spend_records"
    id = Column(Integer, primary_key=True, autoincrement=True)
    provider = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    tokens_in = Column(Integer, default=0)
    tokens_out = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)
    project_name = Column(String, default="")
    raw_json = Column(JSON, default=dict)
    recorded_at = Column(DateTime, default=datetime.utcnow)

# --- Pydantic Schemas ---
class AgentSchema(BaseModel):
    id: str
    name: str
    model: str = ""
    workspace: str = ""
    description: str = ""
    is_default: bool = False
    assigned_skills: List[str] = []
    
    class Config:
        from_attributes = True

class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    github_url: str = ""
    fly_app_name: str = ""
    live_url: str = ""
    twilio_sid: str = ""

class ProjectSchema(ProjectCreate):
    id: int
    status: str = "unknown"
    last_deployed: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ChatMessageCreate(BaseModel):
    agent_id: str
    message: str

class ChatMessageSchema(BaseModel):
    id: int
    agent_id: str
    role: str
    content: str
    timestamp: datetime
    
    class Config:
        from_attributes = True

class SpendSummary(BaseModel):
    provider: str
    total_cost: float
    total_tokens_in: int
    total_tokens_out: int

# --- Auth ---
def verify_api_key(authorization: str = Header(None)):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="API key not configured")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or token != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return token

# --- DB Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def load_agents_from_openclaw() -> list:
    """Best-effort fetch of OpenClaw agents list."""
    try:
        result = subprocess.run(
            ["openclaw", "agents", "list", "--json"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            return []
        parsed = json.loads(result.stdout)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict) and isinstance(parsed.get("agents"), list):
            return parsed["agents"]
        return []
    except Exception:
        return []


def sync_agents_from_cli(db: Session, prune_missing: bool = True):
    """Sync DB agents from OpenClaw CLI output.

    Returns: (added, updated, removed, total_cli)
    """
    cli_agents = load_agents_from_openclaw()
    if not cli_agents:
        return 0, 0, 0, 0

    added = 0
    updated = 0
    removed = 0

    cli_ids = set()

    for cli_agent in cli_agents:
        agent_id = cli_agent.get("id") or cli_agent.get("agentId")
        if not agent_id:
            continue

        cli_ids.add(agent_id)
        cli_default = bool(cli_agent.get("isDefault") or cli_agent.get("is_default"))

        existing = db.query(Agent).filter(Agent.id == agent_id).first()
        if existing:
            existing.name = cli_agent.get("name") or existing.name or agent_id
            existing.model = cli_agent.get("model") or existing.model
            existing.workspace = cli_agent.get("workspace") or existing.workspace
            existing.assigned_skills = cli_agent.get("skills") or existing.assigned_skills or []
            existing.is_default = cli_default
            existing.updated_at = datetime.utcnow()
            updated += 1
        else:
            db.add(Agent(
                id=agent_id,
                name=cli_agent.get("name") or agent_id,
                model=cli_agent.get("model") or "",
                workspace=cli_agent.get("workspace") or "",
                description="",
                is_default=cli_default,
                assigned_skills=cli_agent.get("skills") or [],
            ))
            added += 1

    if prune_missing:
        existing_ids = {a.id for a in db.query(Agent).all()}
        stale_ids = existing_ids - cli_ids
        if stale_ids:
            removed = db.query(Agent).filter(Agent.id.in_(list(stale_ids))).delete(synchronize_session=False)

    # Ensure exactly one default if possible
    defaults = db.query(Agent).filter(Agent.is_default == True).all()
    if len(defaults) == 0 and cli_ids:
        first = db.query(Agent).filter(Agent.id.in_(list(cli_ids))).first()
        if first:
            first.is_default = True
    elif len(defaults) > 1:
        keep = defaults[0].id
        db.query(Agent).filter(Agent.is_default == True, Agent.id != keep).update({"is_default": False}, synchronize_session=False)

    db.commit()
    return added, updated, removed, len(cli_ids)

# --- Background Task: Poll Spend Data ---
async def poll_spend_data_once():
    """Poll spend APIs once and store results.

    NOTE: real provider integrations are pending. We upsert a single daily placeholder
    per provider so charts remain stable without duplicate inflation.
    """
    db = SessionLocal()
    try:
        today = date.today()

        def upsert_placeholder(provider: str, tokens_in: int, tokens_out: int, cost_usd: float, project_name: str = "default"):
            existing = db.query(SpendRecord).filter(
                SpendRecord.provider == provider,
                SpendRecord.date == today,
                SpendRecord.project_name == project_name,
            ).first()

            if existing:
                existing.tokens_in = tokens_in
                existing.tokens_out = tokens_out
                existing.cost_usd = cost_usd
                existing.recorded_at = datetime.utcnow()
            else:
                db.add(SpendRecord(
                    provider=provider,
                    date=today,
                    tokens_in=tokens_in,
                    tokens_out=tokens_out,
                    cost_usd=cost_usd,
                    project_name=project_name,
                ))

        moonshot_key = os.getenv("MOONSHOT_API_KEY")
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")

        if moonshot_key:
            # TODO: replace with real Moonshot usage endpoint integration
            upsert_placeholder("moonshot", 1000, 500, 0.05)

        if anthropic_key:
            # TODO: replace with real Anthropic usage endpoint integration
            upsert_placeholder("claude", 2000, 800, 0.12)

        if not moonshot_key and not anthropic_key:
            # Keep one demo row for empty environments
            upsert_placeholder("moonshot", 5000, 2000, 0.25, "demo")

        db.commit()
        print(f"Poll completed at {datetime.utcnow()}")
    except Exception as e:
        print(f"Poll error: {e}")
    finally:
        db.close()


async def poll_spend_data():
    """Polls spend APIs every 5 minutes."""
    while True:
        try:
            await poll_spend_data_once()
        except Exception as e:
            print(f"Spend poll error: {e}")
        await asyncio.sleep(300)  # 5 minutes

# --- Lifespan ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    # Seed sample data if empty
    db = SessionLocal()
    try:
        if db.query(Project).count() == 0:
            sample_projects = [
                Project(name="meal-planner", description="Family meal planning app", 
                       fly_app_name="chad-meal-planner", live_url="https://chad-meal-planner.fly.dev",
                       github_url="https://github.com/chad/meal-planner", status="running"),
                Project(name="dashi", description="AI agent dashboard (this app)",
                       fly_app_name="dashi", status="development"),
            ]
            for p in sample_projects:
                db.add(p)
            db.commit()
        
        # Prefer real OpenClaw agents if available
        added, updated, removed, total_cli = sync_agents_from_cli(db, prune_missing=True)

        # Fallback: keep a single sane default agent if OpenClaw CLI is unavailable
        if total_cli == 0 and db.query(Agent).count() == 0:
            db.add(Agent(
                id="main",
                name="Main",
                model="openai-codex/gpt-5.3-codex",
                description="Primary assistant",
                is_default=True,
                assigned_skills=[],
            ))
            db.commit()
    finally:
        db.close()
    
    # Start background polling
    task = asyncio.create_task(poll_spend_data())
    yield
    task.cancel()

# --- FastAPI App ---
app = FastAPI(title="Dashi", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Agent Routes ---
@app.get("/api/agents", response_model=List[AgentSchema])
def list_agents(db: Session = Depends(get_db), api_key: str = Depends(verify_api_key)):
    agents = db.query(Agent).order_by(Agent.is_default.desc(), Agent.name.asc()).all()
    return agents

@app.get("/api/agents/{agent_id}", response_model=AgentSchema)
def get_agent(agent_id: str, db: Session = Depends(get_db), api_key: str = Depends(verify_api_key)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

async def send_discord_notification(agent_name: str, agent_id: str):
    """Send Discord message to trigger OpenClaw default update."""
    discord_webhook = os.getenv("DISCORD_WEBHOOK_URL")
    if not discord_webhook:
        return  # Silently skip if no webhook configured
    
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                discord_webhook,
                json={
                    "content": f"🔄 **Dashi Update**: Setting `{agent_name}` ({agent_id}) as default agent.\n@OpenClaw set default {agent_id}"
                },
                timeout=10.0
            )
    except Exception as e:
        print(f"Failed to send Discord notification: {e}")

@app.put("/api/agents/{agent_id}", response_model=AgentSchema)
async def update_agent(agent_id: str, data: AgentSchema, db: Session = Depends(get_db), 
                api_key: str = Depends(verify_api_key)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Check if setting as default
    setting_default = data.is_default and not agent.is_default
    
    # Keep only one default agent
    if data.is_default:
        db.query(Agent).filter(Agent.id != agent_id, Agent.is_default == True).update({"is_default": False}, synchronize_session=False)

    # Update fields
    agent.name = data.name
    agent.model = data.model
    agent.workspace = data.workspace
    agent.description = data.description
    agent.is_default = data.is_default
    agent.assigned_skills = data.assigned_skills
    agent.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(agent)
    
    # If setting as default, notify via Discord
    if setting_default:
        await send_discord_notification(agent.name, agent.id)
    
    return agent

@app.post("/api/agents/sync")
def sync_agents(db: Session = Depends(get_db), api_key: str = Depends(verify_api_key)):
    """Sync agents from OpenClaw CLI and prune stale entries."""
    try:
        added, updated, removed, total_cli = sync_agents_from_cli(db, prune_missing=True)
        if total_cli == 0:
            return {
                "message": "OpenClaw CLI unavailable or returned no agents",
                "added": 0,
                "updated": 0,
                "removed": 0,
                "total": 0,
            }

        return {
            "message": f"Synced {total_cli} agents: {added} added, {updated} updated, {removed} removed",
            "added": added,
            "updated": updated,
            "removed": removed,
            "total": total_cli,
        }
    except Exception as e:
        return {"message": f"Sync error: {str(e)}", "added": 0, "updated": 0, "removed": 0, "total": 0}

# --- Chat Routes ---
@app.get("/api/chat/history")
def get_chat_history(agent_id: str, limit: int = 50, db: Session = Depends(get_db),
                    api_key: str = Depends(verify_api_key)):
    messages = db.query(ChatHistory).filter(ChatHistory.agent_id == agent_id)\
                 .order_by(ChatHistory.timestamp.desc()).limit(limit).all()
    return messages[::-1]  # Return in chronological order

# Cost estimates per 1K tokens (approximate)
COST_ESTIMATES = {
    "qwen": {"cost": 0.0, "label": "Unavailable (local only)"},
    "main": {"cost": 0.003, "label": "~$0.003/msg"},
    "opus": {"cost": 0.05, "label": "~$0.05/msg"},
    "gemini": {"cost": 0.001, "label": "~$0.001/msg"},
}

@app.get("/api/agents/{agent_id}/cost")
def get_agent_cost(agent_id: str, api_key: str = Depends(verify_api_key)):
    """Get estimated cost for chatting with this agent."""
    estimate = COST_ESTIMATES.get(agent_id, {"cost": 0.01, "label": "~$0.01/msg"})
    return estimate

@app.get("/api/config/discord")
def get_discord_config(api_key: str = Depends(verify_api_key)):
    """Check if Discord webhook is configured."""
    return {
        "configured": bool(os.getenv("DISCORD_WEBHOOK_URL")),
        "message": "Discord notifications enabled" if os.getenv("DISCORD_WEBHOOK_URL") else "Set DISCORD_WEBHOOK_URL env var to enable"
    }

@app.post("/api/chat/send", response_model=ChatMessageSchema)
async def send_message(data: ChatMessageCreate, db: Session = Depends(get_db),
                api_key: str = Depends(verify_api_key)):
    # Store user message
    user_msg = ChatHistory(agent_id=data.agent_id, role="user", content=data.message)
    db.add(user_msg)
    db.commit()
    
    # Get agent to determine which API to call
    agent = db.query(Agent).filter(Agent.id == data.agent_id).first()
    
    if data.agent_id == "gemini":
        # Call Gemini API
        assistant_content = await call_gemini_api(data.message)
    elif data.agent_id == "main":
        # Call Moonshot API directly
        assistant_content = await call_moonshot_api(data.message)
    elif data.agent_id == "opus":
        # Call Anthropic API directly
        assistant_content = await call_anthropic_api(data.message)
    elif data.agent_id == "qwen":
        # Qwen requires local Ollama - not available in container
        assistant_content = "Error: Qwen (local) is not available in the cloud deployment. Use Gemini, Kimi, or Opus instead."
    else:
        assistant_content = f"Echo: {data.message}"
    
    assistant_msg = ChatHistory(agent_id=data.agent_id, role="assistant", content=assistant_content)
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)
    
    return assistant_msg

async def call_openclaw_agent(agent_id: str, message: str) -> str:
    """Call an agent via OpenClaw sessions_spawn."""
    try:
        # Map agent IDs to models
        model_map = {
            "main": "kimi-k2.5",
            "opus": "claude-opus-4",
            "qwen": "ollama/qwen2.5-coder:7b",
            "gemini": "gemini-2.5-flash"
        }
        
        model = model_map.get(agent_id, "kimi-k2.5")
        
        # Create a temporary session via OpenClaw
        result = subprocess.run(
            ["openclaw", "sessions", "spawn", "--model", model, "--mode", "run", "--timeout", "60",
             f"Respond to this message concisely: {message}"],
            capture_output=True,
            text=True,
            timeout=65
        )
        
        if result.returncode == 0:
            return result.stdout.strip() or "No response from agent"
        else:
            return f"Agent error: {result.stderr}"
            
    except subprocess.TimeoutExpired:
        return "Error: Agent timed out (60s limit)"
    except FileNotFoundError:
        return "Error: OpenClaw CLI not found. Is OpenClaw installed and in PATH?"
    except Exception as e:
        return f"Error calling agent: {str(e)}"

async def call_gemini_api(message: str) -> str:
    """Call Google Gemini API."""
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        return "Error: GEMINI_API_KEY not configured in environment"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key={gemini_api_key}",
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{"role": "user", "parts": [{"text": message}]}],
                    "generationConfig": {"maxOutputTokens": 4096, "temperature": 0.7}
                },
                timeout=60.0
            )
            
            if response.status_code == 200:
                data = response.json()
                if "candidates" in data and len(data["candidates"]) > 0:
                    return data["candidates"][0]["content"]["parts"][0]["text"]
                return "Error: Empty response from Gemini"
            else:
                return f"Error: Gemini API returned {response.status_code} - {response.text}"
    except Exception as e:
        return f"Error calling Gemini API: {str(e)}"

async def call_moonshot_api(message: str) -> str:
    """Call Moonshot (Kimi) API."""
    moonshot_key = os.getenv("MOONSHOT_API_KEY")
    if not moonshot_key:
        return "Error: MOONSHOT_API_KEY not configured. Set it with: flyctl secrets set MOONSHOT_API_KEY=your_key"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.moonshot.cn/v1/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {moonshot_key}"
                },
                json={
                    "model": "kimi-k2.5",
                    "messages": [{"role": "user", "content": message}],
                    "max_tokens": 4096,
                    "temperature": 0.7
                },
                timeout=60.0
            )
            
            if response.status_code == 200:
                data = response.json()
                if "choices" in data and len(data["choices"]) > 0:
                    return data["choices"][0]["message"]["content"]
                return "Error: Empty response from Moonshot"
            else:
                return f"Error: Moonshot API returned {response.status_code} - {response.text}"
    except Exception as e:
        return f"Error calling Moonshot API: {str(e)}"

async def call_anthropic_api(message: str) -> str:
    """Call Anthropic (Claude) API."""
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if not anthropic_key:
        return "Error: ANTHROPIC_API_KEY not configured. Set it with: flyctl secrets set ANTHROPIC_API_KEY=your_key"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": anthropic_key,
                    "anthropic-version": "2023-06-01"
                },
                json={
                    "model": "claude-opus-4",
                    "max_tokens": 4096,
                    "messages": [{"role": "user", "content": message}]
                },
                timeout=60.0
            )
            
            if response.status_code == 200:
                data = response.json()
                if "content" in data and len(data["content"]) > 0:
                    return data["content"][0]["text"]
                return "Error: Empty response from Claude"
            else:
                return f"Error: Anthropic API returned {response.status_code} - {response.text}"
    except Exception as e:
        return f"Error calling Anthropic API: {str(e)}"

@app.delete("/api/chat/history")
def clear_chat_history(agent_id: str, db: Session = Depends(get_db),
                      api_key: str = Depends(verify_api_key)):
    db.query(ChatHistory).filter(ChatHistory.agent_id == agent_id).delete()
    db.commit()
    return {"message": "Chat history cleared"}

# --- Project Routes ---
@app.get("/api/projects", response_model=List[ProjectSchema])
def list_projects(db: Session = Depends(get_db), api_key: str = Depends(verify_api_key)):
    projects = db.query(Project).order_by(Project.updated_at.desc()).all()
    return projects

@app.get("/api/projects/{project_id}", response_model=ProjectSchema)
def get_project(project_id: int, db: Session = Depends(get_db), api_key: str = Depends(verify_api_key)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@app.post("/api/projects", response_model=ProjectSchema)
def create_project(data: ProjectCreate, db: Session = Depends(get_db),
                  api_key: str = Depends(verify_api_key)):
    project = Project(**data.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@app.put("/api/projects/{project_id}", response_model=ProjectSchema)
def update_project(project_id: int, data: ProjectCreate, db: Session = Depends(get_db),
                  api_key: str = Depends(verify_api_key)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    for key, value in data.model_dump().items():
        setattr(project, key, value)
    project.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(project)
    return project

@app.delete("/api/projects/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db),
                  api_key: str = Depends(verify_api_key)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return {"message": "Project deleted"}

@app.post("/api/projects/{project_id}/restart")
def restart_project(project_id: int, db: Session = Depends(get_db),
                   api_key: str = Depends(verify_api_key)):
    """Restart Fly app."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project.fly_app_name:
        return {"message": "No Fly app name configured for this project", "success": False}
    
    try:
        result = subprocess.run(
            ["flyctl", "apps", "restart", project.fly_app_name],
            capture_output=True,
            text=True,
            timeout=60
        )
        if result.returncode == 0:
            project.last_deployed = datetime.utcnow()
            db.commit()
            return {"message": f"Restarted {project.fly_app_name}", "success": True, "output": result.stdout}
        else:
            return {"message": f"Failed to restart: {result.stderr}", "success": False, "output": result.stderr}
    except FileNotFoundError:
        return {"message": "flyctl not found - install Fly CLI", "success": False, "output": ""}
    except subprocess.TimeoutExpired:
        return {"message": "Restart timed out", "success": False, "output": ""}
    except Exception as e:
        return {"message": f"Error: {str(e)}", "success": False, "output": str(e)}

@app.get("/api/projects/{project_id}/logs")
def get_project_logs(project_id: int, lines: int = 50, db: Session = Depends(get_db),
                    api_key: str = Depends(verify_api_key)):
    """Fetch Fly logs."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project.fly_app_name:
        return {"logs": [], "message": "No Fly app name configured"}
    
    try:
        result = subprocess.run(
            ["flyctl", "logs", "--app", project.fly_app_name, "-n", str(lines)],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0:
            log_lines = [line for line in result.stdout.split('\n') if line.strip()]
            return {"logs": log_lines, "success": True}
        else:
            return {"logs": [], "message": f"Failed to fetch logs: {result.stderr}", "success": False}
    except FileNotFoundError:
        return {"logs": [], "message": "flyctl not found - install Fly CLI", "success": False}
    except subprocess.TimeoutExpired:
        return {"logs": [], "message": "Logs fetch timed out", "success": False}
    except Exception as e:
        return {"logs": [], "message": f"Error: {str(e)}", "success": False}

# --- Spend Routes ---
@app.get("/api/spend/summary")
def get_spend_summary(db: Session = Depends(get_db), api_key: str = Depends(verify_api_key)):
    """Get total spend summary."""
    results = db.query(
        SpendRecord.provider,
        func.sum(SpendRecord.cost_usd).label("total_cost"),
        func.sum(SpendRecord.tokens_in).label("total_tokens_in"),
        func.sum(SpendRecord.tokens_out).label("total_tokens_out")
    ).group_by(SpendRecord.provider).all()
    
    return [
        {
            "provider": r.provider,
            "total_cost": r.total_cost or 0,
            "total_tokens_in": r.total_tokens_in or 0,
            "total_tokens_out": r.total_tokens_out or 0
        }
        for r in results
    ]

@app.get("/api/spend/daily")
def get_daily_spend(days: int = 30, db: Session = Depends(get_db),
                   api_key: str = Depends(verify_api_key)):
    """Get daily spend breakdown."""
    start_date = date.today() - timedelta(days=days)
    results = db.query(
        SpendRecord.date,
        SpendRecord.provider,
        func.sum(SpendRecord.cost_usd).label("cost")
    ).filter(SpendRecord.date >= start_date)\
     .group_by(SpendRecord.date, SpendRecord.provider).all()
    
    # Organize by date
    daily = {}
    for r in results:
        date_str = r.date.isoformat()
        if date_str not in daily:
            daily[date_str] = {"date": date_str, "moonshot": 0, "claude": 0}
        daily[date_str][r.provider] = r.cost or 0
    
    return sorted(daily.values(), key=lambda x: x["date"])

@app.get("/api/spend/by-provider")
def get_spend_by_provider(db: Session = Depends(get_db), api_key: str = Depends(verify_api_key)):
    """Get spend grouped by provider."""
    return get_spend_summary(db, api_key)

@app.get("/api/spend/by-project")
def get_spend_by_project(db: Session = Depends(get_db), api_key: str = Depends(verify_api_key)):
    """Get spend grouped by project."""
    results = db.query(
        SpendRecord.project_name,
        func.sum(SpendRecord.cost_usd).label("total_cost")
    ).group_by(SpendRecord.project_name).all()
    
    return [
        {"project": r.project_name or "unknown", "cost": r.total_cost or 0}
        for r in results
    ]

@app.post("/api/spend/poll")
async def trigger_spend_poll(api_key: str = Depends(verify_api_key)):
    """Manually trigger spend polling."""
    # Run poll in background so we don't block the response
    asyncio.create_task(poll_spend_data_once())
    return {"message": "Polling started"}

# --- Health ---
@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "0.1.0"}

# --- Static File Serving (SPA) ---
# Note: API routes are defined above and take precedence due to order

# Mount static assets directory explicitly (Vite builds assets to /assets)
if os.path.isdir(STATIC_DIR):
    assets_dir = os.path.join(STATIC_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

# SPA catch-all route - MUST be at the bottom after all API routes
# This handles: 1) Static files, 2) Client-side routes -> index.html
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """Serve SPA for all non-API routes."""
    # API 404 - should not happen since API routes are defined above, but just in case
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
    
    # Try to serve the actual file if it exists (for non-asset static files like favicon.ico)
    file_path = os.path.join(STATIC_DIR, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # Otherwise serve index.html for client-side routing
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)
    
    raise HTTPException(status_code=404, detail="Frontend not built")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)