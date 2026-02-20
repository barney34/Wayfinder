"""
AI Routes - SmartFill and Context Generation
"""

import os
import json
import uuid
from fastapi import APIRouter, HTTPException

from models.schemas import AnalyzeNotesRequest, GenerateContextRequest, ValueDiscoveryChatRequest
from data.questions import DISCOVERY_QUESTIONS
from data.valueFramework import VALUE_FRAMEWORK
from emergentintegrations.llm.chat import LlmChat, UserMessage

router = APIRouter(prefix="/api", tags=["ai"])

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")


@router.get("/questions")
async def get_questions():
    """Get all discovery questions"""
    return DISCOVERY_QUESTIONS


@router.get("/value-framework")
async def get_value_framework():
    """Get the value framework data"""
    return VALUE_FRAMEWORK


@router.post("/generate-value-props")
async def generate_value_props(request: GenerateContextRequest):
    """Generate value propositions for a specific category based on customer data"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI integration not configured")

    category_id = request.contextType  # optimize, accelerate, or protect
    category = next((c for c in VALUE_FRAMEWORK["categories"] if c["id"] == category_id), None)
    if not category:
        raise HTTPException(status_code=400, detail=f"Unknown category: {category_id}")

    # Build customer context from answers
    answers_text_parts = []
    for question_id, answer in request.answers.items():
        question = next((q for q in DISCOVERY_QUESTIONS if q["id"] == question_id), None)
        if question and answer:
            answers_text_parts.append(f"Q: {question['question']}\nA: {answer}")
    answers_text = "\n\n".join(answers_text_parts) if answers_text_parts else "No discovery answers available yet."

    meeting_notes_section = f"Meeting Notes:\n{request.meetingNotes}" if request.meetingNotes else ""

    # Build prompt with value framework context
    before_scenarios = "\n".join(f"- {s}" for s in category["before_scenarios"])
    solutions = "\n".join(f"- {s}" for s in category["infoblox_solves"])
    outcomes = "\n".join(f"- {o}" for o in category["positive_outcomes"])
    metrics = "\n".join(f"- {m}" for m in category["key_metrics"])

    prompt = f"""You are an Infoblox value consultant. Based on the customer's discovery data, generate a customer-specific value proposition for the "{category['name']}" category.

VALUE FRAMEWORK CONTEXT:
Before Scenarios (problems customers face):
{before_scenarios}

How Infoblox Solves These:
{solutions}

Positive Business Outcomes:
{outcomes}

Industry Metrics:
{metrics}

CUSTOMER DATA:
{answers_text}

{meeting_notes_section}

INSTRUCTIONS:
Generate a response with these 3 sections, using bullet points:

**Problems Identified**
Based on the customer's data, list the specific problems/pain points they face that align with this category. Be specific to their situation. If no customer data, use the most common before scenarios.

**How Infoblox Solves This**
Map the customer's problems to specific Infoblox solutions. Be concrete about which capabilities address which pain points.

**Expected Business Outcomes**
List measurable outcomes the customer can expect, citing relevant industry metrics where appropriate.

Keep each bullet point concise (1-2 lines). Be specific and actionable, not generic marketing speak."""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"value-props-{uuid.uuid4()}",
            system_message="You are an expert Infoblox value consultant who creates compelling, customer-specific value propositions. Output professional bullet points. Be specific with technologies, quantities, and metrics."
        ).with_model("gemini", "gemini-3-flash-preview")

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        return {"summary": response.strip()}

    except Exception as e:
        print(f"Error generating value props: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate value propositions: {str(e)}")


@router.post("/analyze-notes")
async def analyze_notes(request: AnalyzeNotesRequest):
    """Analyze meeting notes and match to discovery questions using AI"""
    if not request.notes or not request.notes.strip():
        raise HTTPException(status_code=400, detail="Meeting notes are required")
    
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI integration not configured")
    
    try:
        # Build questions list for prompt
        questions_text = "\n".join([
            f"ID: {q['id']}, Question: {q['question']}"
            for q in DISCOVERY_QUESTIONS
        ])
        
        prompt = f"""Analyze the following meeting notes and extract answers to discovery questions.

Meeting Notes:
{request.notes}

Discovery Questions:
{questions_text}

For each question that can be answered from the meeting notes, return a match with:
- questionId: the question ID
- answer: the extracted answer (concise, matching the question format)
- confidence: "high" or "medium"

Return ONLY a JSON object with format: {{ "matches": [{{"questionId": "...", "answer": "...", "confidence": "..."}}] }}"""

        # Use Gemini 3 Flash via emergentintegrations (low temperature for consistent outputs)
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"analyze-notes-{uuid.uuid4()}",
            system_message="You are an expert at extracting structured information from meeting notes."
        ).with_model("gemini", "gemini-3-flash-preview")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse the JSON response
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        data = json.loads(response_text)
        return data
        
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
        return {"matches": []}
    except Exception as e:
        print(f"Error analyzing notes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze meeting notes: {str(e)}")


@router.post("/generate-context")
async def generate_context(request: GenerateContextRequest):
    """Generate context summary using AI"""
    if not request.contextType or (not request.answers and not request.meetingNotes):
        raise HTTPException(status_code=400, detail="Context type and answers or meeting notes are required")
    
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI integration not configured")
    
    try:
        # Build question-answer pairs for prompt
        answers_text_parts = []
        for question_id, answer in request.answers.items():
            question = next((q for q in DISCOVERY_QUESTIONS if q["id"] == question_id), None)
            if question and answer:
                answers_text_parts.append(f"Q: {question['question']}\nA: {answer}")
        answers_text = "\n\n".join(answers_text_parts) if answers_text_parts else "No discovery answers available yet."
        
        # Build notes text
        notes_text_parts = []
        for question_id, note in request.notes.items():
            question = next((q for q in DISCOVERY_QUESTIONS if q["id"] == question_id), None)
            if question and note:
                notes_text_parts.append(f"Context for \"{question['question']}\":\n{note}")
        notes_text = "\n\n".join(notes_text_parts) if notes_text_parts else ""
        
        # Meeting notes section
        meeting_notes_section = f"Meeting Notes / Call Transcript:\n{request.meetingNotes}" if request.meetingNotes else ""
        
        # Build prompt based on context type - with bullet point style instructions
        prompt_instructions = {
            "environment": """Summarize the customer's current technical environment in bullet point format. Include:
• Current IPAM, DNS, DHCP setup and products being used
• Vendor/technology specifics (Microsoft, BIND, Cloudflare, AWS Route 53, etc.)
• Locations (datacenters, sites, branches)
• Current integrations (Splunk, SIEM, etc.)
• Network bandwidth considerations

Format as concise bullet points. Example format:
**IPAM**
• IPAM is currently inconsistently managed across various spreadsheets, DNS and DHCP server configurations, and Active Directory

**DNS**
• DNS is primarily hosted on AD servers with GSS-TSIG enabled
• Cloudflare provides external authoritative DNS""",
            "outcomes": """Summarize the customer's desired project outcomes in bullet point format. Include:
• Project background and why this project exists
• Goals of the project (not just "migrate to DDI")
• Pain points being resolved
• Project timeline and phases
• Project sponsors/owners/customers

Format as concise bullet points. Example format:
1. Lower operational burden by allowing administrators to be more productive with less maintenance
2. Reduce the footprint of dedicated Microsoft servers leveraged for DDI services
3. Centralize administration for DDI services rather than having multiple systems""",
            "endState": """Summarize the customer's target end state in bullet point format. Include:
• Target architecture and platform (UDDI, NIOS-X, etc.)
• DNS migration strategy (off-load from AD servers, etc.)
• DHCP services deployment plan
• Security features (Threat Defense, etc.)
• Integration requirements (Splunk, Ansible, Terraform, etc.)

Format as numbered bullet points. Example format:
1. Implement UDDI as the centralized SaaS management platform for DDI
2. Connect UDDI with AWS Route 53 DNS for overlay visibility and management
3. Off-load DNS from Active Directory servers onto NIOS-X DNS""",
            "endstate": """Summarize the customer's target end state in bullet point format. Include the target architecture, migration path, and DDI design features.""",
            "migration": "Outline the recommended migration path and implementation approach in bullet point format.",
        }.get(request.contextType, f"Generate a summary for {request.contextType} in bullet point format.")
        
        notes_section = f"Additional Context Notes:\n{notes_text}" if notes_text else ""
        
        prompt = f"""{prompt_instructions}

Discovery Questions and Answers:
{answers_text}

{notes_section}

{meeting_notes_section}

Generate a concise, professional summary using bullet points. Keep each bullet point short and descriptive (1-2 lines max). Do not include headers like "Here is a summary" - just output the bullet points directly."""

        # Use Gemini 3 Flash via emergentintegrations (low temperature for consistent outputs)
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"generate-context-{uuid.uuid4()}",
            system_message="You are an expert technical consultant creating professional DDI infrastructure documentation. Output concise, actionable bullet points. Be specific with product names, technologies, and quantities when available."
        ).with_model("gemini", "gemini-3-flash-preview")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {"summary": response.strip()}
        
    except Exception as e:
        print(f"Error generating context: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate context summary: {str(e)}")



@router.post("/value-discovery-chat")
async def value_discovery_chat(request: ValueDiscoveryChatRequest):
    """
    AI-powered conversational Value Discovery.
    
    Hybrid approach:
    - Tracks which topics have been covered
    - Generates contextual follow-up questions
    - Ensures all required topics are addressed naturally
    """
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI integration not configured")
    
    try:
        # Build conversation history for context
        convo_text = "\n".join([
            f"{'Assistant' if m.role == 'system' else 'Customer'}: {m.content}"
            for m in request.conversation
        ])
        
        # Determine uncovered topics
        covered = set(request.coveredTopics)
        uncovered_required = [t for t in request.requiredTopics if t.required and t.id not in covered]
        uncovered_optional = [t for t in request.requiredTopics if not t.required and t.id not in covered]
        
        # Build topic guidance
        topic_guidance = ""
        if uncovered_required:
            topic_guidance = f"Topics still to cover (required): {', '.join(t.label for t in uncovered_required)}"
        elif uncovered_optional:
            topic_guidance = f"Optional topics to explore: {', '.join(t.label for t in uncovered_optional)}"
        else:
            topic_guidance = "All key topics covered. You can wrap up or explore any interesting points deeper."
        
        # Context hints for the section
        hints = ', '.join(request.contextHints) if request.contextHints else 'general DDI challenges'
        
        prompt = f"""You are a skilled sales engineer conducting a Value Discovery conversation for the {request.section} area.

CONVERSATION SO FAR:
{convo_text}

GUIDANCE:
{topic_guidance}

Context hints for this section: {hints}

TOPIC DEFINITIONS:
- current-state: Understanding their current tools, processes, and infrastructure
- pain-points: Specific problems, frustrations, or challenges they face
- business-impact: How these issues affect the business (costs, time, risk, productivity)
- goals: What outcomes they want to achieve

INSTRUCTIONS:
1. Acknowledge what the customer just shared (briefly, 1 sentence max)
2. Ask ONE focused follow-up question that:
   - Digs deeper into what they said OR
   - Naturally transitions to an uncovered topic
3. Keep your response conversational and under 50 words
4. Don't be robotic - sound like a human consultant
5. If they mention numbers or specifics, probe deeper on those

Also analyze which topics the customer's LAST response touched on. Return your analysis.

OUTPUT FORMAT (JSON):
{{
  "response": "Your conversational follow-up question here",
  "topicsCovered": ["topic-id-1", "topic-id-2"]  // IDs of topics touched in customer's LAST message
}}"""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"vd-chat-{uuid.uuid4()}",
            system_message="You are a consultative sales engineer skilled at discovery conversations. Be natural, curious, and empathetic. Keep responses brief."
        ).with_model("gemini", "gemini-3-flash-preview")

        user_message = UserMessage(text=prompt)
        response_text = await chat.send_message(user_message)
        
        # Parse JSON response
        response_text = response_text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        try:
            data = json.loads(response_text)
            return {
                "response": data.get("response", "Can you tell me more about the business impact of that?"),
                "newTopicsCovered": data.get("topicsCovered", [])
            }
        except json.JSONDecodeError:
            # If JSON parsing fails, use the raw response
            return {
                "response": response_text if len(response_text) < 200 else "That's helpful. Can you tell me more about the business impact?",
                "newTopicsCovered": []
            }

    except Exception as e:
        print(f"Error in value discovery chat: {e}")
        # Return a fallback response instead of erroring
        return {
            "response": "Thanks for sharing that. Can you tell me more about how this impacts your day-to-day operations?",
            "newTopicsCovered": []
        }
