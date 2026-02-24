#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Test the Sizing/Drawing table for: 1) Column headers showing two-line layout for SW/HW Add-ons, 2) Button style showing '+' when nothing selected, 3) PSU logic (1506 only with AC/DC labels), 4) SFP visibility (10GE models only)"

frontend:
  - task: "Sizing Table Column Headers - Two-line Add-ons Layout"
    implemented: true
    working: "NA"
    file: "frontend/src/components/sizing/calculators/SizingTableHeader.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
        - agent: "testing"
        - comment: "Code review verified: Lines 128-141 show SW and HW Add-ons headers with two-line layout ('Add-ons' label above 'SW'/'HW'). Implementation is correct. Unable to verify UI due to empty database - need customer with sites to test visually."

  - task: "Add-ons Button Style - Plus Character Display"
    implemented: true
    working: "NA"
    file: "frontend/src/components/sizing/calculators/SiteTableRow.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
        - agent: "testing"
        - comment: "Code review verified: SW button (lines 767-779) and HW button (lines 846-865) show '+' character when nothing selected, no longer shows '—' dash. Implementation is correct. Unable to verify UI due to empty database."

  - task: "PSU Logic - 1506 Models Only with AC/DC Labels"
    implemented: true
    working: "NA"
    file: "frontend/src/components/sizing/calculators/platformConfig.js, SiteTableRow.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
        - agent: "testing"
        - comment: "Code review verified: PSU only appears for 1506 models (platformConfig.js lines 145-152 allowedModels), NOT for 906 models. Label dynamically shows 'T-PSU600-AC' or 'T-PSU600-DC' based on model (SiteTableRow.jsx lines 877-881). Implementation is correct. Unable to verify UI due to empty database."

  - task: "SFP Visibility - 10GE Models Only"
    implemented: true
    working: "NA"
    file: "frontend/src/components/sizing/calculators/SiteTableRow.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
        - agent: "testing"
        - comment: "Code review verified: SFP Interfaces section only appears when model contains '10GE' (line 906 conditional check). Implementation is correct. Unable to verify UI due to empty database."

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Sizing Table Column Headers - Two-line Add-ons Layout"
    - "Add-ons Button Style - Plus Character Display"
    - "PSU Logic - 1506 Models Only with AC/DC Labels"
    - "SFP Visibility - 10GE Models Only"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "testing"
    - message: "Code review completed for Sizing/Drawing table changes. All 4 requirements verified in code: 1) Column headers show two-line layout with 'Add-ons' above 'SW'/'HW' (SizingTableHeader.jsx L128-141), 2) Buttons show '+' when empty (SiteTableRow.jsx L774, L860), 3) PSU only for 1506 models with AC/DC labels (platformConfig.js L145-152, SiteTableRow.jsx L877-881), 4) SFP only for 10GE models (SiteTableRow.jsx L906). Implementation is correct. UI testing blocked: database has no customers. Need user to create customer > navigate to Sizing > Drawing tab > add sites to verify visual display."