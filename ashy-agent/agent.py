import os
import sys
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain.agents import create_openai_tools_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from db import query
from tools import (
    get_projects,
    get_tasks,
    get_project_members,
    create_task,
    summarize_meeting_notes,
    get_workspace_summary,
)

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
if not OPENAI_API_KEY:
    print("Error: OPENAI_API_KEY is not set in .env")
    sys.exit(1)

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    print("Error: DATABASE_URL is not set in .env")
    sys.exit(1)


def get_workspace_id() -> str:
    """Fetch the first workspace from the DB."""
    rows = query('SELECT id, name FROM "Workspace" LIMIT 1')
    if not rows:
        raise RuntimeError("No workspace found in the database.")
    print(f"Connected to workspace: {rows[0]['name']}")
    return rows[0]["id"]


def build_agent(workspace_id: str) -> AgentExecutor:
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        api_key=OPENAI_API_KEY,
        temperature=0.2,
    )

    tools = [
        get_projects,
        get_tasks,
        get_project_members,
        create_task,
        summarize_meeting_notes,
        get_workspace_summary,
    ]

    system_prompt = f"""You are Ashy, the AI project management assistant for this workspace.

Your workspace ID is: {workspace_id}

You have full access to the workspace data. When users ask about projects, tasks, or team members,
always fetch fresh data using your tools — never guess or make up information.

Guidelines:
- Always use get_workspace_summary or get_projects first to understand the current state.
- When creating tasks, confirm the details with the user before proceeding if anything is unclear.
- When summarizing meeting notes, extract clear action items with owners and deadlines.
- Be concise and direct. Format lists with bullet points.
- If a project_id is needed and not given, use get_projects to find it first.
- Today's date: {__import__('datetime').date.today()}
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    agent = create_openai_tools_agent(llm, tools, prompt)
    return AgentExecutor(agent=agent, tools=tools, verbose=False, max_iterations=10)


def main():
    print("\n🤖 Ashy — AI Project Assistant")
    print("─" * 40)
    print("Type your message. Commands: /quit to exit, /clear to reset history.\n")

    try:
        workspace_id = get_workspace_id()
    except Exception as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)

    agent_executor = build_agent(workspace_id)
    chat_history = []

    while True:
        try:
            user_input = input("You: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nGoodbye!")
            break

        if not user_input:
            continue
        if user_input.lower() in ("/quit", "/exit", "quit", "exit"):
            print("Goodbye!")
            break
        if user_input.lower() == "/clear":
            chat_history = []
            print("Ashy: History cleared.\n")
            continue

        try:
            result = agent_executor.invoke({
                "input": user_input,
                "chat_history": chat_history,
            })
            answer = result["output"]
            print(f"\nAshy: {answer}\n")

            chat_history.append(HumanMessage(content=user_input))
            chat_history.append(AIMessage(content=answer))

        except Exception as e:
            print(f"\nAshy: Sorry, I hit an error — {e}\n")


if __name__ == "__main__":
    main()
