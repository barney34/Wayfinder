"""
Infoblox Value Framework Data
Contains value drivers, discovery questions, and solution outcomes
for the 3 key categories.

Tags are section-specific:
- IPAM: IP Address Management section
- IDNS: Internal DNS section  
- EDNS: External DNS section
- DHCP: DHCP section
- CLOUD: Cloud Management section
- SECURITY: Security section
"""

VALUE_FRAMEWORK = {
    "categories": [
        {
            "id": "optimize",
            "name": "Optimize Critical Services",
            "icon": "shield-check",
            "description": "Drive productivity and business continuity through unified visibility, contextual insights and management of critical network services.",
            "discovery_questions": [
                # IPAM-specific questions
                {"id": "vf-opt-ipam-1", "question": "How do you currently track and manage IP address allocation across your organization?", "tags": ["IPAM"]},
                {"id": "vf-opt-ipam-2", "question": "Have you experienced IP conflicts or addressing issues? What was the impact?", "tags": ["IPAM"]},
                {"id": "vf-opt-ipam-3", "question": "How do you maintain visibility of all networked assets and their IP assignments?", "tags": ["IPAM"]},
                
                # Internal DNS-specific questions
                {"id": "vf-opt-idns-1", "question": "How do you manage internal DNS zones and records today (AD-integrated, BIND, other)?", "tags": ["IDNS"]},
                {"id": "vf-opt-idns-2", "question": "What challenges do you face with internal name resolution performance or reliability?", "tags": ["IDNS"]},
                {"id": "vf-opt-idns-3", "question": "How do you handle DNS for internal applications and services?", "tags": ["IDNS"]},
                
                # External DNS-specific questions
                {"id": "vf-opt-edns-1", "question": "Who manages your external/public DNS zones and how is that coordinated?", "tags": ["EDNS"]},
                {"id": "vf-opt-edns-2", "question": "How do you ensure high availability for your external DNS?", "tags": ["EDNS"]},
                
                # DHCP-specific questions
                {"id": "vf-opt-dhcp-1", "question": "How do you manage DHCP scopes and lease allocation across your sites?", "tags": ["DHCP"]},
                {"id": "vf-opt-dhcp-2", "question": "Have you had DHCP exhaustion or scope conflicts? How did you resolve them?", "tags": ["DHCP"]},
                
                # Cloud-specific questions
                {"id": "vf-opt-cloud-1", "question": "What are your business goals for cloud and how are you organized to deliver against these goals?", "tags": ["CLOUD"]},
                {"id": "vf-opt-cloud-2", "question": "How do you maintain visibility of DDI services across your cloud environments (AWS, Azure, GCP)?", "tags": ["CLOUD"]},
                
                # Security-specific questions
                {"id": "vf-opt-sec-1", "question": "How do you currently achieve visibility of security events across your entire network?", "tags": ["SECURITY"]},
                {"id": "vf-opt-sec-2", "question": "How do you determine the user and owner of an asset that displays an IOC?", "tags": ["SECURITY"]},
                {"id": "vf-opt-sec-3", "question": "How are you using DNS for visibility of security events?", "tags": ["SECURITY"]},
            ],
            "before_scenarios": [
                "Fragmented monitoring and management across cloud providers and on-premises with different tools/APIs",
                "Performance monitoring challenges across hybrid, multi-cloud without a single viewpoint",
                "Compliance complexity without unified visibility and control of entire network assets",
                "Operational complexity managing network operations across multiple environments",
                "Network outages caused by lack of visibility, manual tools and human error",
                "Lack of granular visibility into network and cloud assets, risking shadow IT and orphaned assets",
            ],
            "infoblox_solves": [
                "Comprehensive visibility into workloads across multiple public clouds, private clouds, on-premises or hybrids of all three",
                "Automated Asset Visibility and Insights across all networked devices including IoT and VMs across on-prem and hybrid multi-cloud",
                "Centralized management of critical network services (DNS, DHCP, IPAM)",
                "Performance tracking and analysis of network data to identify bottlenecks and provide actionable optimization data",
                "On-demand real-time forensic query and performance data for remediation and conflict resolution",
                "Threat visibility before 'Day Zero' - identify and alert on suspicious activity before it hits the environment",
            ],
            "positive_outcomes": [
                "Efficient resource utilization and capacity planning through informed decision-making",
                "Maximize uptime and efficiencies of critical network services and business-critical applications",
                "Reduced time to respond to network-related issues and improved troubleshooting",
                "Reduced risk of human error in provisioning/de-provisioning critical network services",
                "Faster deployment of critical network services across multi-cloud environments",
            ],
            "key_metrics": [
                "150 hours/year spent on network asset inventory audits",
                "7.5 hours downtime/year @ $300k/hour = ~$2M+ cost",
                "35% of DDI heads' time on remote admin = 1.5 FTE",
                "$2M/year average cost of network outages for Enterprise",
                "$800k+ average cost to manage a material breach",
                "55% of critical alerts missed by SOC",
                "250+ days average to detect and contain a breach",
            ],
        },
        {
            "id": "accelerate",
            "name": "Accelerate Hybrid-Cloud & Digital Transformation",
            "icon": "rocket",
            "description": "Leveraging standards-based automation and control to deploy new applications at speed across hybrid multi-cloud boundaries.",
            "discovery_questions": [
                # IPAM-specific questions
                {"id": "vf-acc-ipam-1", "question": "How long does it take to provision IP addresses for new applications or services?", "tags": ["IPAM"]},
                {"id": "vf-acc-ipam-2", "question": "How do you synchronize IPAM changes across enterprise and cloud environments?", "tags": ["IPAM"]},
                
                # Internal DNS-specific questions
                {"id": "vf-acc-idns-1", "question": "How do you handle DNS record provisioning when deploying new internal services?", "tags": ["IDNS"]},
                {"id": "vf-acc-idns-2", "question": "Have DNS misconfigurations caused outages? What was the root cause?", "tags": ["IDNS"]},
                
                # External DNS-specific questions
                {"id": "vf-acc-edns-1", "question": "How quickly can you update external DNS records for new services or failover?", "tags": ["EDNS"]},
                {"id": "vf-acc-edns-2", "question": "Have you experienced external DNS outages from third-party providers?", "tags": ["EDNS"]},
                
                # DHCP-specific questions
                {"id": "vf-acc-dhcp-1", "question": "How do you deploy DHCP services to new sites or locations?", "tags": ["DHCP"]},
                {"id": "vf-acc-dhcp-2", "question": "What is your process for DHCP failover and redundancy?", "tags": ["DHCP"]},
                
                # Cloud-specific questions
                {"id": "vf-acc-cloud-1", "question": "How many cloud providers do you use and how do you manage DDI across them?", "tags": ["CLOUD"]},
                {"id": "vf-acc-cloud-2", "question": "How are you using automation (Terraform, Ansible) for DDI provisioning?", "tags": ["CLOUD"]},
                {"id": "vf-acc-cloud-3", "question": "What is your average time to deploy a new cloud application end-to-end?", "tags": ["CLOUD"]},
                
                # Security-specific questions
                {"id": "vf-acc-sec-1", "question": "How do you ensure security compliance when rapidly deploying new services?", "tags": ["SECURITY"]},
            ],
            "before_scenarios": [
                "Service stability challenges with critical network outages and delays deploying new applications",
                "Fragmented network and cloud management with multiple tools and manual processes",
                "Performance management challenges with slow deployment of new cloud services",
                "Networking and cloud teams operating in silos without clear alignment to business",
                "Cloud integration complexities with multiple cloud environments, APIs, and tools",
                "Automation and orchestration failures from manual tools and cloud vendor lock-in",
                "Misconfigurations from manual tools/processes leading to outages",
                "Expanding attack surface from orphaned assets, abandoned DNS records, or exposed workloads",
            ],
            "infoblox_solves": [
                "Unified platform for cohesive centralized management, automation, and ecosystem integration across DCs, clouds, IoT, and users",
                "Automated site provisioning and administration to reduce deployment time from weeks to minutes",
                "Comprehensive DDI visibility across on-premises, hybrid, and multi-cloud environments",
                "Flexible deployment options: physical, virtual, or cloud-native as-a-service delivery centrally managed via cloud portal",
                "Self-service capabilities for DNS with simplified and trusted provisioning",
                "Network availability and resilience improved through fewer human errors and outages",
                "Unified teams: Cloud, networking, and security teams working together across complex environments",
                "Asset Insights: broadest range of discovery sources using DNS and DHCP for analytics",
            ],
            "positive_outcomes": [
                "Improved reliability and availability minimizing cost of downtime",
                "Enhanced scalability and flexibility to dynamically respond to business demands",
                "Reduced operational and infrastructure costs through automation",
                "Accelerated time to market through faster service deployment",
                "Improved business agility for competitive advantage",
                "Optimized security spending by uplifting existing security tool effectiveness",
            ],
            "key_metrics": [
                "90% of Enterprises have 2+ public clouds plus on-premises",
                "80% of companies manage DNS manually or in spreadsheets",
                ">50% of Enterprises have 3+ DNS, 3+ DHCP, 3+ API tools",
                "12 unplanned downtimes per year (average Enterprise)",
                "5 FTEs required just to manage DDI tasks",
                "4 hours/week/FTE spent on DDI troubleshooting",
                "$75k-$100k average cost to spin up a new site",
                "6 weeks average for cloud ops to deploy each new application",
                "35% of FTE time on site administration",
            ],
        },
        {
            "id": "protect",
            "name": "Proactively Protect the Business",
            "icon": "shield",
            "description": "Proactively shield the business by monitoring, detecting, and blocking malicious activities leveraging DNS before they reach the network.",
            "discovery_questions": [
                # IPAM-specific questions
                {"id": "vf-pro-ipam-1", "question": "Have you had issues with orphaned or rogue IP assets? What was the security impact?", "tags": ["IPAM"]},
                
                # Internal DNS-specific questions  
                {"id": "vf-pro-idns-1", "question": "How do you monitor internal DNS for signs of malicious activity or data exfiltration?", "tags": ["IDNS"]},
                {"id": "vf-pro-idns-2", "question": "Are you using DNS response policy zones (RPZ) for threat blocking internally?", "tags": ["IDNS"]},
                
                # External DNS-specific questions
                {"id": "vf-pro-edns-1", "question": "How do you protect against DNS-based attacks on your external infrastructure?", "tags": ["EDNS"]},
                {"id": "vf-pro-edns-2", "question": "Are you concerned about lookalike domains targeting your brand?", "tags": ["EDNS"]},
                
                # DHCP-specific questions
                {"id": "vf-pro-dhcp-1", "question": "How do you detect and respond to rogue DHCP servers on your network?", "tags": ["DHCP"]},
                
                # Cloud-specific questions
                {"id": "vf-pro-cloud-1", "question": "How are you securing DNS and DHCP in your cloud environments?", "tags": ["CLOUD"]},
                {"id": "vf-pro-cloud-2", "question": "What security concerns do you have across on-premises and cloud?", "tags": ["CLOUD"]},
                
                # Security-specific questions
                {"id": "vf-pro-sec-1", "question": "How do you currently align your cybersecurity strategy with business objectives?", "tags": ["SECURITY"]},
                {"id": "vf-pro-sec-2", "question": "How confident are you in detecting and responding to threats in real-time?", "tags": ["SECURITY"]},
                {"id": "vf-pro-sec-3", "question": "Can you describe a recent incident that highlighted vulnerabilities?", "tags": ["SECURITY"]},
                {"id": "vf-pro-sec-4", "question": "How are you using DNS to inform your overall threat posture?", "tags": ["SECURITY"]},
                {"id": "vf-pro-sec-5", "question": "How do you protect IoT/OT devices that can't run endpoint agents?", "tags": ["SECURITY"]},
            ],
            "before_scenarios": [
                "Expanded attack surface as companies embrace hybrid multi-cloud",
                "Configuration management vulnerabilities from multiple user types and cloud configs",
                "Over-reliance on cloud-native security controls that differ across vendors",
                "Increased risk of ransomware/APT at the DNS layer during attack lifecycle",
                "SOC team overwhelmed by increasing alerts, leading to burnout",
                "Control evasion by threat actors using DNS obfuscation techniques",
                "Inefficient threat hunting on an ad-hoc basis with poor control adjustments",
                "Incident response delays from lack of context at the SOC",
            ],
            "infoblox_solves": [
                "Block threats 60+ days before other security solutions with 0.002% false positive rates",
                "DNS-centric threat intelligence from a dedicated team delivering original, hunted threat intel",
                "Real-time DNS traffic visibility with proactive blocking",
                "SOC Insights for accelerated incident response with AI-driven analytics",
                "Lookalike domain protection and take-down services (24-48 hour industry-leading SLA)",
                "Protect IoT/OT devices without requiring an agent",
                "Complete hybrid security across on-premises, cloud, hybrid multi-cloud",
                "Autocorrelation of user and device data using IPAM and DHCP to isolate threats",
                "Advanced DNS Protection to automatically detect and stop DNS attacks (DDoS)",
            ],
            "positive_outcomes": [
                "Reduced troubleshooting time, minimized downtime, reduced MTTR",
                "Reduction in false positives reducing SOC team burnout",
                "Reduced cybersecurity risk by preempting attacks before they damage the business",
                "Preserved and enhanced brand reputation through proactive protection",
                "More productive SOC team refocused on business acceleration",
                "Optimized security spending via automated intelligence integration",
            ],
            "key_metrics": [
                "55% of critical alerts missed by the SOC",
                ">90% of attacks leverage DNS",
                "20 lookalike domains per month (average large Enterprise)",
                "12M DNS queries per month (average Enterprise)",
                "$800k+ average cost to manage a material breach (IBM: $4.9M total)",
                "250+ days to detect and respond to a breach",
                "$590k average cost per ransomware breach",
                "60+ days ahead of attacks for security at DNS level",
                "75% of threats detected before the first DNS query",
            ],
        },
    ]
}
