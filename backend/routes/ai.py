"""
AI Routes - SmartFill and Context Generation
"""

import os
import json
from fastapi import APIRouter, HTTPException

from models.schemas import AnalyzeNotesRequest, GenerateContextRequest, ValueDiscoveryChatRequest
from data.questions import DISCOVERY_QUESTIONS
from data.valueFramework import VALUE_FRAMEWORK
from services.llm import send_message as llm_send

router = APIRouter(prefix="/api", tags=["ai"])

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")


@router.get("/ai-health")
async def ai_health():
    """Quick check: is the Gemini API key set and can we reach the model?"""
    if not GOOGLE_API_KEY:
        return {"status": "error", "detail": "GOOGLE_API_KEY not set"}
    try:
        response = await llm_send(
            prompt="Reply with exactly: OK",
            system_message="You are a health-check bot. Reply with exactly one word.",
            api_key=GOOGLE_API_KEY,
        )
        return {"status": "ok", "model_response": response.strip()}
    except Exception as e:
        return {"status": "error", "detail": f"{type(e).__name__}: {e}"}


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
    if not GOOGLE_API_KEY:
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
        response = await llm_send(
            prompt=prompt,
            system_message="You are an expert Infoblox value consultant who creates compelling, customer-specific value propositions. Output professional bullet points. Be specific with technologies, quantities, and metrics.",
            api_key=GOOGLE_API_KEY,
        )
        return {"summary": response.strip()}

    except Exception as e:
        print(f"Error generating value props: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate value propositions: {str(e)}")


@router.post("/analyze-notes")
async def analyze_notes(request: AnalyzeNotesRequest):
    """Analyze meeting notes and match to discovery questions using AI"""
    if not request.notes or not request.notes.strip():
        raise HTTPException(status_code=400, detail="Meeting notes are required")
    
    if not GOOGLE_API_KEY:
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

        response = await llm_send(
            prompt=prompt,
            system_message="You are an expert at extracting structured information from meeting notes.",
            api_key=GOOGLE_API_KEY,
        )
        
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
    
    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=500, detail="AI integration not configured")
    
    try:
        # ── Section filter: only include Q&A relevant to this context type ──────
        SECTION_FILTERS = {
            "environment": {"IPAM", "Internal DNS", "External DNS", "DHCP", "Overlay", "Users - Devices - Sites"},
            "outcomes":    {"Users - Devices - Sites", "Professional Services", "IPAM", "Services"},
            "endState":    {"Services", "Security", "Overlay", "Users - Devices - Sites", "Asset/ Network Insight"},
            "endstate":    {"Services", "Security", "Overlay", "Users - Devices - Sites"},
            "migration":   {"Users - Devices - Sites", "Professional Services", "Services"},
        }
        allowed_sections = SECTION_FILTERS.get(request.contextType, None)  # None = all sections

        answers_text_parts = []
        for question_id, answer in request.answers.items():
            question = next((q for q in DISCOVERY_QUESTIONS if q["id"] == question_id), None)
            if question and answer:
                if allowed_sections is None or question.get("section") in allowed_sections:
                    answers_text_parts.append(f"Q: {question['question']}\nA: {answer}")
        answers_text = "\n\n".join(answers_text_parts) if answers_text_parts else "No discovery answers available yet."

        # Build notes text (always include all per-question notes)
        notes_text_parts = []
        for question_id, note in request.notes.items():
            question = next((q for q in DISCOVERY_QUESTIONS if q["id"] == question_id), None)
            if question and note:
                notes_text_parts.append(f"Context for \"{question['question']}\":\n{note}")
        notes_text = "\n\n".join(notes_text_parts) if notes_text_parts else ""

        # Meeting notes section
        meeting_notes_section = f"Meeting Notes / Call Transcript:\n{request.meetingNotes}" if request.meetingNotes else ""

        # ── Customer + sizing header ─────────────────────────────────────────────
        cust = request.customerName or "the customer"
        opp  = request.opportunityName or ""
        ss   = request.sizingSummary or {}
        total_ips    = ss.get("totalIPs", 0)
        site_count   = ss.get("siteCount", 0)
        total_objects= ss.get("totalObjects", 0)
        dns_sites    = ss.get("dnsSiteCount", 0)
        platform     = request.platformMode or ss.get("platformMode", "")

        header_parts = [f"Customer: {cust}"]
        if opp:
            header_parts.append(f"Opportunity: {opp}")
        if platform:
            header_parts.append(f"Platform: {platform}")
        if site_count:
            header_parts.append(f"{site_count} sites")
        if total_ips:
            header_parts.append(f"~{total_ips:,} active IPs")
        if total_objects:
            header_parts.append(f"~{total_objects:,} grid objects")
        if dns_sites:
            header_parts.append(f"{dns_sites} DNS servers")
        customer_header = " | ".join(header_parts)

        # ── Prompt instructions per context type ─────────────────────────────────
        closing = f"""
Generate a concise, professional summary for {cust}. Rules:
- Write exactly 4-5 bullet points. Use up to 10 only if the data genuinely requires it.
- Use {cust}'s actual product names, technologies, vendor names, and site counts from the data above.
- Do NOT mention tokens, token packs, licenses, SKUs, or pricing of any kind.
- Keep each bullet to 1-2 lines. Do not add a header like "Here is a summary" — output bullets directly."""

        prompt_instructions = {
            "environment": f"""Summarize {cust}'s current technical environment. Include:
• Current IPAM, DNS, and DHCP platforms/vendors in use
• Locations: data centers, regional hubs, branch offices, cloud platforms
• Active directory or Microsoft DNS/DHCP integration if present
• Key integrations (SIEM, vulnerability scanners, orchestration tools)
• Scale: estimated IP count, DHCP percentage, site count

Example bullets (adapt to {cust}'s actual data):
• {cust} manages DNS/DHCP across X data centers, Y regional hubs, and Z branch offices with no centralized DDI platform
• DNS is hosted on [vendor] servers; external DNS is managed by [vendor]
• DHCP serves approximately [N] dynamic clients with [lease time] lease times""",

            "outcomes": f"""Summarize {cust}'s desired project outcomes for the {opp or 'DDI project'}. Include:
• Why this project exists and what pain it resolves
• Business goals (not just "migrate to DDI" — be specific to {cust})
• Operational improvements expected
• Timeline or phases if known
• Project sponsors or stakeholders if mentioned

Example bullets:
• {cust} aims to consolidate fragmented DDI management across [N] locations into a single platform
• Reduce operational burden on network admins managing [vendor] DNS servers manually
• Gain visibility into multi-cloud DNS across [cloud platforms]""",

            "endState": f"""Summarize {cust}'s target end state after the {opp or 'DDI project'}. Include:
• Target platform and architecture (NIOS, UDDI, NXaaS, Hybrid)
• DNS and DHCP migration plan
• Cloud and overlay integrations planned
• Security services to be enabled (Threat Defense, DFP, etc.)
• Automation and integration tools (Ansible, Terraform, Splunk, etc.)

Example bullets:
• Deploy [platform] as the centralized DDI management platform across all [N] sites
• Enable Threat Defense for DNS security across physical and cloud environments
• Connect [cloud platforms] via overlay for unified DNS visibility""",

            "endstate": f"""Summarize {cust}'s target end state. Include the target architecture, migration path, and key DDI design features.""",
            "migration": f"""Outline the recommended migration path for {cust}'s {opp or 'DDI project'} in bullet point format.""",
        }.get(request.contextType, f"Generate a summary for {request.contextType} for {cust} in bullet point format.")

        notes_section = f"Additional Context Notes:\n{notes_text}" if notes_text else ""

        prompt = f"""Customer Context:
{customer_header}

{prompt_instructions}

Discovery Q&A:
{answers_text}

{notes_section}

{meeting_notes_section}
{closing}"""

        response = await llm_send(
            prompt=prompt,
            system_message=f"You are an expert technical consultant writing professional DDI infrastructure documentation for {cust}. Be specific — use the customer's actual vendor names, platform choices, site counts, and IP scale from the provided data. Never mention tokens, licenses, SKUs, or pricing.",
            api_key=GOOGLE_API_KEY,
        )

        return {"summary": response.strip()}
        
    except Exception as e:
        print(f"Error generating context: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate context summary: {str(e)}")



@router.post("/value-discovery-chat")
async def value_discovery_chat(request: ValueDiscoveryChatRequest):
    """
    AI-powered conversational Value Discovery.
    
    Features:
    - 3-question limit per topic for focused discovery
    - Mode toggle: Guided (AI-led) vs Free Ask (user-led)
    - Topic tracking and suggestions
    """
    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=500, detail="AI integration not configured")
    
    try:
        # Build conversation history for context
        convo_text = "\n".join([
            f"{'Assistant' if m.role == 'system' else 'Customer'}: {m.content}"
            for m in request.conversation[-10:]  # Last 10 messages for context
        ])
        
        # Calculate topic status
        topic_status = []
        incomplete_topics = []
        for t in request.requiredTopics:
            count = request.topicQuestionCounts.get(t.id, 0)
            remaining = request.maxQuestionsPerTopic - count
            status = "complete" if remaining <= 0 else f"{remaining} questions left"
            topic_status.append(f"- {t.label}: {status}")
            if remaining > 0:
                incomplete_topics.append(t)
        
        topic_status_text = "\n".join(topic_status)
        
        # Determine next topic suggestion — only when the current topic is finishing
        current_count = request.topicQuestionCounts.get(request.currentTopic, 0)
        topic_complete = current_count >= request.maxQuestionsPerTopic
        suggested_next = None
        if topic_complete:
            for t in request.requiredTopics:
                if t.required and request.topicQuestionCounts.get(t.id, 0) < request.maxQuestionsPerTopic:
                    if t.id != request.currentTopic:
                        suggested_next = t.id
                        break
        
        # Context hints for the section
        hints = ', '.join(request.contextHints) if request.contextHints else 'general DDI challenges'
        
        # Build "what we already know" from discovery form answers (needed by topic_complete branch)
        known_facts = []
        if request.discoveryAnswers:
            for qid, ans in request.discoveryAnswers.items():
                if ans and not qid.startswith('vd-'):
                    q = next((q for q in DISCOVERY_QUESTIONS if q["id"] == qid), None)
                    if q:
                        known_facts.append(f"- {q['question']}: {ans}")
        known_context = (
            "WHAT WE ALREADY KNOW FROM THE DISCOVERY FORM:\n" + "\n".join(known_facts[:15])
            if known_facts else ""
        )

        # ── 3-Deep Questioning layer logic ──────────────────────────────────────
        # current_count is questions ALREADY asked on this topic (opener = 1).
        # So: count=1 → next ask is L2 (implication), count=2 → L3 (impact), count=3 → topic done.
        question_depth = min(current_count, 3)  # 1=just opened, 2=L2, 3=L3

        if request.mode == 'free':
            mode_instructions = """FREE ASK MODE:
The user is asking their own question. Respond naturally and helpfully.
Answer their question directly, then optionally ask a brief follow-up if relevant."""

        elif topic_complete:
            topic_label = next(
                (t.label for t in request.requiredTopics if t.id == request.currentTopic),
                request.currentTopic
            )
            # Map section to VF category id
            section_to_vf = {
                'IPAM': 'optimize', 'Internal DNS': 'optimize',
                'External DNS': 'optimize', 'DHCP': 'optimize',
                'Overlay': 'accelerate', 'Services': 'accelerate',
                'Cloud Management': 'accelerate',
                'Security': 'protect',
            }
            vf_cat_id = section_to_vf.get(request.section, 'optimize')
            vf_cat = next(
                (c for c in VALUE_FRAMEWORK['categories'] if c['id'] == vf_cat_id),
                VALUE_FRAMEWORK['categories'][0]
            )
            # Pull 3 most relevant solution bullets and 2 outcome bullets
            solves = '\n'.join(f'- {s}' for s in vf_cat['infoblox_solves'][:3])
            outcomes = '\n'.join(f'- {o}' for o in vf_cat['positive_outcomes'][:2])
            known_facts_short = '\n'.join(known_facts[:8]) if known_facts else 'No form answers yet.'

            mode_instructions = f"""SPIN SELLING — NEED-PAYOFF PIVOT for {request.section}.

KNOWN CUSTOMER DATA:
{known_facts_short}

INFOBLOX CAPABILITY ANGLES (do NOT name Infoblox or products — use these as inspiration):
{solves}

POSITIVE OUTCOMES TO CONNECT TO:
{outcomes}

YOU MUST PRODUCE TWO SEPARATE OUTPUTS:

1. "statement" — a 2-sentence statement (NO question mark, ≤35 words total):
   Sentence A must start with: "What I'm hearing is..." or "So the real issue is..."
   — restate their core pain using their exact words.
   Sentence B must start with: "The good news is..." or "What the best teams in your space do is..."
   — hint at a better way using the capability angles above, without naming any product.

2. "needPayoff" — ONE question (≤25 words):
   Must start with: "If you could [solve that / prevent that / automate that]..."
   — ask what it would mean for their team, budget, risk, or business.
   Connect to the positive outcomes listed above.

3. "bridgeQuestion" — a brief rep-side note question to explore scope further (≤20 words).

RULES:
- Do NOT ask another drilling question in "statement".
- Do NOT name Infoblox, NIOS, UDDI, or any product name.
- Be specific — reference what they actually said, not generic DDI language.

OUTPUT FORMAT (JSON only, no markdown):
{{
  "statement": "What I'm hearing is... The good news is...",
  "needPayoff": "If you could prevent that, what would it mean for...?",
  "topic": "{request.currentTopic}",
  "bridgeQuestion": "Rep-side scope question."
}}"""

        else:
            # Determine which layer to ask next
            if question_depth <= 1:
                layer_instruction = f"""ASK L2 — IMPLICATION / EFFECT:
The customer just described their current state. Now dig one layer deeper.
Ask WHY that's a challenge, HOW it affects their team or operations, or what HAPPENS when things go wrong.
Use "why", "how", "what happens when", or "what does that mean for" phrasing.
ONE question only. Max 30 words."""
            elif question_depth == 2:
                layer_instruction = f"""ASK L3 — BUSINESS IMPACT / PAIN:
You understand the implication. Now surface the real pain — financial cost, risk, emotional weight, or strategic urgency.
Ask about: cost/time wasted, risk to the business, what it means for their job/team, or the urgency.
Use "what does that cost", "what's the risk if", "how long can you", or "what happens to your team" phrasing.
ONE question only. Max 35 words. Make them feel the weight of the problem."""
            else:
                layer_instruction = f"""ASK L3 — BUSINESS IMPACT / PAIN (final depth):
Push for the deepest pain. Ask about financial exposure, competitive risk, executive pressure, or personal accountability.
ONE question only. Max 35 words."""

            mode_instructions = f"""GUIDED 3-DEEP QUESTIONING — {request.section}:
Current topic: {request.currentTopic} | Questions asked on this topic: {current_count}/{request.maxQuestionsPerTopic}

TOPIC STATUS:
{topic_status_text}

STEP 1: Acknowledge what the customer just shared in ≤10 words.
STEP 2: {layer_instruction}"""

        prompt = f"""You are a skilled sales engineer running a Value Discovery conversation for {request.section}.

{known_context}

CONVERSATION SO FAR:
{convo_text}

{mode_instructions}

Relevant context: {hints}

CRITICAL RULES:
- NEVER ask about something already answered in the discovery form above.
- Build ON what is known — reference specific facts when probing deeper.
- Each question must move forward, not sideways or backward.

OUTPUT FORMAT (JSON only, no markdown):
{{
  "response": "Your response here",
  "topic": "{request.currentTopic}"
}}"""

        response_text = await llm_send(
            prompt=prompt,
            system_message="You are a consultative sales engineer. Be natural, empathetic, and concise. Never give a lecture — ask one question at a time.",
            api_key=GOOGLE_API_KEY,
        )

        # Parse JSON response
        cleaned = response_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            data = json.loads(cleaned)
            # topic_complete responses have statement+needPayoff; others have response
            if topic_complete and data.get("statement"):
                ai_response = data["statement"]
                need_payoff = data.get("needPayoff") or None
            else:
                ai_response = data.get("response", "Can you tell me more about that?")
                need_payoff = None
            return {
                "response": ai_response,
                "needPayoff": need_payoff,
                "topic": request.currentTopic,  # never let AI drift the topic
                "suggestedNextTopic": suggested_next,
                "topicComplete": topic_complete,
                "questionDepth": question_depth,
                "suggestedBridgeQuestion": data.get("bridgeQuestion") or None,
            }
        except json.JSONDecodeError:
            return {
                "response": cleaned if len(cleaned) < 200 else "Thanks for sharing. Can you tell me more?",
                "needPayoff": None,
                "topic": request.currentTopic,
                "suggestedNextTopic": suggested_next,
                "topicComplete": topic_complete,
                "questionDepth": question_depth,
                "suggestedBridgeQuestion": None,
            }

    except Exception as e:
        print(f"Error in value discovery chat: {e}")
        return {
            "response": "Thanks for that. Can you tell me more about how this impacts your operations?",
            "topic": request.currentTopic,
            "suggestedNextTopic": None,
            "topicComplete": False,
            "questionDepth": 1,
            "suggestedBridgeQuestion": None,
        }
