export const discoveryQuestions = [
  {
    "id": "ud-platform",
    "section": "Users - Devices - Sites",
    "question": "Target Platform",
    "technicalOnly": true,
    "fieldType": "select",
    "options": [
      "NIOS (Physical/Virtual)",
      "UDDI (NIOS-X/NXaaS)",
      "Hybrid (NIOS GM + UDDI Members)"
    ],
    "defaultValue": "NIOS (Physical/Virtual)",
    "tooltip": "NIOS: Physical or Virtual TE-series with HA support. UDDI: NIOS-X (virtual, no HA) or NXaaS (cloud, HA by default). Hybrid: NIOS GM/GMC for database with UDDI members serving DNS/DHCP per site.",
    "hidden": true
  },
  {
    "id": "ud-1",
    "section": "Users - Devices - Sites",
    "question": "Estimated number of knowledge workers",
    "technicalOnly": true
  },
  {
    "id": "ud-site-config",
    "section": "Sizing Data",
    "question": "Site Configuration",
    "technicalOnly": true,
    "fieldType": "siteConfiguration",
    "tooltip": "Configure sites with their IP allocations and roles (GM/GMC/DNS/DHCP/Discovery). GM and GMC are sized for total grid objects and listed first."
  },
  {
    "id": "ipam-0",
    "section": "IPAM",
    "question": "Current DNS Platform",
    "technicalOnly": false,
    "fieldType": "multiselect",
    "options": [
      "Spreadsheets",
      "Microsoft",
      "Bluecat",
      "EIP"
    ],
    "allowFreeform": true
  },
  {
    "id": "ipam-9",
    "section": "IPAM",
    "question": "Cloud Platform",
    "technicalOnly": false,
    "fieldType": "multiselect",
    "options": [
      "AWS",
      "Azure",
      "GCP",
      "OCI",
      "Alibaba",
      "IBM"
    ],
    "allowFreeform": true
  },
  {
    "id": "ipam-11",
    "section": "IPAM",
    "question": "3rd Party Integrations",
    "technicalOnly": false,
    "fieldType": "multiselect",
    "options": [
      "Qradar",
      "Splunk",
      "SNOW",
      "Tenable",
      "Crowdstrike",
      "Cisco ISE",
      "Qualys",
      "Rapid7",
      "VMWare",
      "ZScaler"
    ],
    "allowFreeform": true
  },
  {
    "id": "ipam-13",
    "section": "IPAM",
    "question": "Orchestration Tools",
    "technicalOnly": false,
    "fieldType": "multiselect",
    "options": [
      "Ansible",
      "Terraform"
    ],
    "allowFreeform": true
  },
  {
    "id": "ud-5",
    "section": "IPAM",
    "subsection": "Sites & Locations",
    "question": "# of Data Centers",
    "technicalOnly": false,
    "fieldType": "number"
  },
  {
    "id": "ud-7",
    "section": "IPAM",
    "subsection": "Sites & Locations",
    "question": "# of Sites",
    "technicalOnly": false,
    "fieldType": "number"
  },
  {
    "id": "ipam-multiplier",
    "section": "IPAM",
    "question": "IP Addr Multiplier / Devices per User",
    "technicalOnly": true,
    "fieldType": "select",
    "options": [
      "2.5",
      "3.5"
    ],
    "allowFreeform": true,
    "defaultValue": "2.5"
  },
  {
    "id": "ud-2",
    "section": "IPAM",
    "question": "Is there a BYOD Policy in Place?",
    "technicalOnly": true,
    "fieldType": "yesno"
  },
  {
    "id": "ud-2a",
    "section": "IPAM",
    "question": "How many devices are allowed per user?",
    "technicalOnly": true,
    "fieldType": "select",
    "options": [
      "2",
      "3",
      "4"
    ],
    "allowFreeform": true,
    "conditionalOn": {
      "questionId": "ud-2",
      "value": "Yes"
    }
  },
  {
    "id": "ipam-1",
    "section": "IPAM",
    "question": "Estimated number of active IP addresses",
    "technicalOnly": true,
    "fieldType": "ipCalculated"
  },
  {
    "id": "ipam-2-toggle",
    "section": "IPAM",
    "question": "Are you considering IPv6?",
    "technicalOnly": false,
    "fieldType": "yesno"
  },
  {
    "id": "ipam-2",
    "section": "IPAM",
    "question": "Beyond sizing, what are your plans and challenges for securing and managing IPv6 application controls?",
    "valueDiscovery": true,
    "technicalOnly": false,
    "conditionalOn": {
      "questionId": "ipam-2-toggle",
      "value": "Yes"
    }
  },
  {
    "id": "ipam-3",
    "section": "IPAM",
    "question": "Was IPv6 considered in sizing calculations?",
    "technicalOnly": true,
    "fieldType": "yesno",
    "conditionalOn": {
      "questionId": "ipam-2-toggle",
      "value": "Yes"
    }
  },
  {
    "id": "ipam-5",
    "section": "IPAM",
    "question": "What is your IP plan for the future?",
    "valueDiscovery": true,
    "technicalOnly": true
  },
  {
    "id": "ipam-6",
    "section": "IPAM",
    "question": "What is your strategy to identify and eliminate unused IP addresses and orphaned assets?",
    "valueDiscovery": true,
    "type": "note",
    "technicalOnly": false
  },
  {
    "id": "ipam-7",
    "section": "IPAM",
    "question": "Will you leverage a single, unified management platform (like a portal) for all DDI across hybrid, multi-cloud?",
    "valueDiscovery": true,
    "technicalOnly": false
  },
  {
    "id": "ipam-8",
    "section": "IPAM",
    "question": "Will DNS be managed in Portal? Native or Hybrid",
    "technicalOnly": true
  },
  {
    "id": "ipam-10",
    "section": "IPAM",
    "question": "What specific IT/Security systems (e.g., SIEM/SOAR/ITSM) do you need seamless, automated DDI/Security integration with?",
    "valueDiscovery": true,
    "technicalOnly": false
  },
  {
    "id": "ipam-12",
    "section": "IPAM",
    "question": "What tools and processes do you use for continuous, real-time asset discovery (including cloud and IoT devices) across your entire network?",
    "valueDiscovery": true,
    "technicalOnly": false
  },
  {
    "id": "idns-0",
    "section": "Internal DNS",
    "question": "Who is your current platform/vendor?",
    "technicalOnly": true,
    "fieldType": "multiselect",
    "options": [
      "Microsoft",
      "BIND",
      "Bluecat",
      "EIP"
    ],
    "allowFreeform": true
  },
  {
    "id": "idns-0a",
    "section": "Internal DNS",
    "question": "How many forests?",
    "technicalOnly": true,
    "fieldType": "number",
    "defaultValue": "1",
    "conditionalOn": {
      "questionId": "idns-0",
      "value": "Microsoft"
    }
  },
  {
    "id": "idns-servers",
    "section": "Internal DNS",
    "question": "How many servers running DNS?",
    "technicalOnly": true,
    "fieldType": "number"
  },
  {
    "id": "idns-3",
    "section": "Internal DNS",
    "question": "Number of zones",
    "technicalOnly": true
  },
  {
    "id": "idns-4",
    "section": "Internal DNS",
    "question": "Total number of records in all zones combined",
    "technicalOnly": true
  },
  {
    "id": "idns-multiplier",
    "section": "Internal DNS",
    "question": "DNS Multiplier",
    "technicalOnly": true,
    "fieldType": "select",
    "options": [
      "2.5",
      "3"
    ],
    "allowFreeform": true,
    "defaultValue": "2.5"
  },
  {
    "id": "idns-2",
    "section": "Internal DNS",
    "question": "Queries per second rate, aggregate",
    "technicalOnly": true,
    "fieldType": "dnsAggregateCalculated"
  },
  {
    "id": "idns-1",
    "section": "Internal DNS",
    "question": "Queries per second rate, per server",
    "technicalOnly": true,
    "fieldType": "dnsPerServerCalculated"
  },
  {
    "id": "idns-5",
    "section": "Internal DNS",
    "question": "DDNS update per second rate",
    "technicalOnly": true,
    "fieldType": "prefixNumber",
    "defaultValue": "<1",
    "prefix": "<"
  },
  {
    "id": "idns-6",
    "section": "Internal DNS",
    "question": "DDNS updates will be sourced from",
    "technicalOnly": true,
    "fieldType": "multiselect",
    "options": [
      "Client",
      "DHCP Server"
    ],
    "defaultValue": "DHCP Server"
  },
  {
    "id": "idns-7",
    "section": "Internal DNS",
    "question": "Is MS Secure Dynamic Update (GSS-TSIG) currently implemented?",
    "technicalOnly": true,
    "fieldType": "yesno",
    "defaultValue": "No"
  },
  {
    "id": "edns-0",
    "section": "External DNS",
    "question": "Who is your current platform/vendor?",
    "technicalOnly": true,
    "fieldType": "multiselect",
    "options": ["Microsoft", "BIND", "Bluecat", "EIP", "Akamai", "AT&T", "Cloudflare", "GoDaddy", "NS1", "Dyn", "ClouDNS", "Route53", "Google Cloud DNS"],
    "allowFreeform": true
  },
  {
    "id": "edns-4",
    "section": "External DNS",
    "question": "Number of zones",
    "technicalOnly": true
  },
  {
    "id": "edns-5",
    "section": "External DNS",
    "question": "Total number of records in all zones combined",
    "technicalOnly": true,
    "fieldType": "number"
  },
  {
    "id": "edns-1",
    "section": "External DNS",
    "question": "Queries per second rate, per server",
    "technicalOnly": true,
    "fieldType": "dnsPerServerCalculated"
  },
  {
    "id": "edns-2",
    "section": "External DNS",
    "question": "Queries per second rate, aggregate",
    "technicalOnly": true,
    "fieldType": "dnsAggregateCalculated"
  },
  {
    "id": "edns-3",
    "section": "External DNS",
    "question": "Will DNSSEC signing be enabled for authoritative zones?",
    "technicalOnly": true,
    "fieldType": "yesno"
  },
  {
    "id": "dhcp-0",
    "section": "DHCP",
    "question": "Who is your current platform/vendor?",
    "technicalOnly": true,
    "fieldType": "multiselect",
    "options": [
      "Microsoft",
      "ISC",
      "Bluecat",
      "EIP"
    ],
    "allowFreeform": true
  },
  {
    "id": "dhcp-0-pct",
    "section": "DHCP",
    "question": "Percentage of DHCP",
    "technicalOnly": true,
    "fieldType": "number",
    "defaultValue": "80"
  },
  {
    "id": "dhcp-servers",
    "section": "DHCP",
    "question": "How many DHCP servers?",
    "technicalOnly": true,
    "fieldType": "number"
  },
  {
    "id": "dhcp-scopes",
    "section": "DHCP",
    "question": "How many total scopes?",
    "technicalOnly": true,
    "fieldType": "number"
  },
  {
    "id": "dhcp-scopes-network-equipment",
    "section": "DHCP",
    "question": "Are Scopes on Network equipment?",
    "technicalOnly": true,
    "fieldType": "yesno",
    "defaultValue": "No"
  },
  {
    "id": "dhcp-network-equipment-types",
    "section": "DHCP",
    "question": "Network equipment types",
    "technicalOnly": true,
    "fieldType": "multiselect",
    "options": [
      "Router",
      "Load Balancer",
      "Other"
    ],
    "optionsWithVendor": [
      "Router",
      "Load Balancer",
      "Other"
    ],
    "conditionalOn": {
      "questionId": "dhcp-scopes-network-equipment",
      "value": "Yes"
    }
  },
  {
    "id": "dhcp-1",
    "section": "DHCP",
    "question": "What type(s) of DHCP redundancy will be implemented?",
    "technicalOnly": true,
    "fieldType": "dhcpRedundancy"
  },
  {
    "id": "dhcp-2",
    "section": "DHCP",
    "question": "Will DHCP update Microsoft DNS servers via GSS-TSIG?",
    "technicalOnly": true
  },
  {
    "id": "dhcp-3",
    "section": "DHCP",
    "question": "What is the average lease time for wireless devices?",
    "technicalOnly": true,
    "fieldType": "leaseTime",
    "defaultValue": "86400"
  },
  {
    "id": "dhcp-4",
    "section": "DHCP",
    "question": "What is the average lease time for wired devices?",
    "technicalOnly": true,
    "fieldType": "leaseTime",
    "defaultValue": "604800"
  },
  {
    "id": "dhcp-5",
    "section": "DHCP",
    "question": "What is the average lease time for IoT/OT devices, and how do you secure them without an agent?",
    "valueDiscovery": true,
    "technicalOnly": false
  },
  {
    "id": "dhcp-6",
    "section": "DHCP",
    "question": "What is the average lease time for IoT devices?",
    "technicalOnly": true,
    "fieldType": "leaseTime",
    "defaultValue": "604800"
  },
  {
    "id": "dhcp-7",
    "section": "DHCP",
    "question": "Will DHCP update DNS on another platform?",
    "technicalOnly": true,
    "fieldType": "yesno"
  },
  {
    "id": "dhcp-7a",
    "section": "DHCP",
    "question": "Which DNS platform(s) will be updated?",
    "technicalOnly": true,
    "fieldType": "multiselect",
    "options": ["Microsoft DNS", "BIND", "PowerDNS", "Route53", "Cloudflare", "NS1"],
    "allowFreeform": true,
    "conditionalOn": { "questionId": "dhcp-7", "value": "Yes" }
  },
  {
    "id": "dhcp-8",
    "section": "DHCP",
    "question": "Will lease scavenging be enabled?",
    "technicalOnly": true,
    "fieldType": "yesno"
  },
  {
    "id": "dhcp-8a",
    "section": "DHCP",
    "question": "Scavenging initiated by",
    "technicalOnly": true,
    "fieldType": "select",
    "options": ["Server", "Client"],
    "defaultValue": "Server",
    "conditionalOn": { "questionId": "dhcp-8", "value": "Yes" },
    "warningCondition": { "value": "Client", "message": "Not Advised — Clients may leave stale records and weaken security." }
  },
  {
    "id": "dhcp-9",
    "section": "DHCP",
    "question": "Will update on lease renewal be enabled?",
    "technicalOnly": true,
    "fieldType": "yesno"
  },
  {
    "id": "uddi-1",
    "section": "Overlay",
    "question": "Cloudflare management",
    "technicalOnly": true,
    "fieldType": "yesno"
  },
  {
    "id": "uddi-4",
    "section": "Overlay",
    "question": "Akamai management",
    "technicalOnly": true,
    "fieldType": "yesno"
  },
  {
    "id": "uddi-5",
    "section": "Overlay",
    "question": "Zone transfer",
    "technicalOnly": true,
    "fieldType": "yesno",
    "conditionalOn": {
      "questionId": "uddi-4",
      "value": "Yes"
    }
  },
  {
    "id": "svc-1",
    "section": "Services",
    "question": "Will NTP be enabled?",
    "technicalOnly": true
  },
  {
    "id": "svc-2",
    "section": "Services",
    "question": "How will you centralize network data and DNS threat intelligence for your security ecosystem?",
    "valueDiscovery": true,
    "technicalOnly": false
  },
  {
    "id": "svc-3",
    "section": "Services",
    "question": "Will the Cloud Data Connector (CDC) be used?",
    "technicalOnly": true
  },
  {
    "id": "svc-4",
    "section": "Services",
    "question": "Will SNMP be enabled?",
    "technicalOnly": true
  },
  {
    "id": "svc-5",
    "section": "Services",
    "question": "What is your strategy for centralizing and unifying DDI management across your NIOS Grid and cloud environments?",
    "valueDiscovery": true,
    "technicalOnly": false
  },
  {
    "id": "svc-6",
    "section": "Services",
    "question": "Will NIOS Grid Connector be enabled?",
    "technicalOnly": true
  },
  {
    "id": "svc-7",
    "section": "Services",
    "question": "Will DNS Forwarding Proxy (DFP) on NIOS be enabled?",
    "technicalOnly": true
  },
  {
    "id": "svc-8",
    "section": "Services",
    "question": "Are you considering an \"as-a-service\" (SaaS) delivery model for DNS/DHCP to reduce infrastructure overhead?",
    "valueDiscovery": true,
    "technicalOnly": false
  },
  {
    "id": "svc-9",
    "section": "Services",
    "question": "Will DNS/DHCP aaS be used?",
    "technicalOnly": true
  },
  {
    "id": "ms-1",
    "section": "Overlay",
    "question": "Are services enabled for Microsoft Management?",
    "technicalOnly": true,
    "fieldType": "yesno"
  },
  {
    "id": "ms-2",
    "section": "Overlay",
    "question": "What specific Microsoft components are you syncing/integrating with?",
    "technicalOnly": true,
    "fieldType": "multiselect",
    "options": [
      "MS DNS",
      "MS DHCP",
      "Sites/Services",
      "Users",
      "Event Log Collection"
    ],
    "optionsWithPermission": [
      "MS DNS",
      "MS DHCP",
      "Sites/Services"
    ],
    "allowFreeform": true,
    "conditionalOn": {
      "questionId": "ms-1",
      "value": "Yes"
    }
  },
  {
    "id": "ms-7",
    "section": "Overlay",
    "question": "How many domain controllers are there?",
    "technicalOnly": true,
    "conditionalOn": {
      "questionId": "ms-1",
      "value": "Yes"
    }
  },
  {
    "id": "ms-8",
    "section": "Overlay",
    "question": "How many forests do you have?",
    "technicalOnly": false,
    "conditionalOn": {
      "questionId": "ms-1",
      "value": "Yes"
    }
  },
  {
    "id": "ni-greenfield",
    "section": "Asset/ Network Insight",
    "question": "Is this green field?",
    "technicalOnly": true,
    "fieldType": "yesno"
  },
  {
    "id": "ni-1",
    "section": "Asset/ Network Insight",
    "question": "What is the total number of active devices (including IoT/OT and cloud workloads) across your entire hybrid environment?",
    "technicalOnly": true,
    "fieldType": "number"
  },
  {
    "id": "ni-3",
    "section": "Asset/ Network Insight",
    "question": "What is the total number of SNMP/ SSH devices that will be managed/ interrogated?",
    "technicalOnly": true,
    "fieldType": "number"
  },
  {
    "id": "ni-3a",
    "section": "Asset/ Network Insight",
    "question": "What are the types of Layer 2/3 devices?",
    "technicalOnly": true,
    "fieldType": "multiselect",
    "options": [
      "Cisco",
      "Palo",
      "Juniper",
      "HP",
      "Aruba",
      "Extreme",
      "Meraki",
      "Huawei"
    ],
    "allowFreeform": true
  },
  {
    "id": "sec-1",
    "section": "Security",
    "question": "What visibility and controls do you have to detect and block advanced threats (like ransomware or C2) that exploit the DNS layer?",
    "valueDiscovery": true,
    "technicalOnly": false
  },
  {
    "id": "sec-2",
    "section": "Security",
    "question": "How do you ensure your security tools are not overwhelmed by false positives and are using the earliest possible threat intelligence?",
    "valueDiscovery": true,
    "technicalOnly": false
  },
  {
    "id": "sec-3",
    "section": "Security",
    "question": "Are you concerned about lookalike domains (typosquatting), and what is your takedown strategy?",
    "valueDiscovery": true,
    "technicalOnly": false
  },
  {
    "id": "sec-4",
    "section": "Security",
    "question": "How do you reduce SOC alert noise and ensure fast mean-time-to-respond (MTTR) to DNS-related security incidents?",
    "valueDiscovery": true,
    "technicalOnly": false
  },
  {
    "id": "beta-asset-config",
    "section": "Security",
    "subsection": "Token Calculator",
    "question": "TD Cloud",
    "technicalOnly": true,
    "fieldType": "assetConfigInput"
  },
  {
    "id": "beta-td-nios-section",
    "section": "Security",
    "subsection": "Token Calculator",
    "question": "TD for NIOS",
    "technicalOnly": true,
    "fieldType": "tdNiosSection"
  },
  {
    "id": "beta-reporting",
    "section": "Security",
    "subsection": "Token Calculator",
    "question": "Reporting",
    "technicalOnly": true,
    "fieldType": "reportingInput"
  },
  {
    "id": "beta-dossier",
    "section": "Security",
    "subsection": "Token Calculator",
    "group": "Add-Ons",
    "question": "Dossier (25 Queries per day)",
    "technicalOnly": true,
    "fieldType": "dossierInput"
  },
  {
    "id": "beta-lookalike",
    "section": "Security",
    "subsection": "Token Calculator",
    "group": "Add-Ons",
    "question": "Lookalike Monitoring (25 Domains)",
    "technicalOnly": true,
    "fieldType": "lookalikeInput",
    "tooltip": "Are you interested in lookalike domain monitoring? This helps detect typosquatting and brand impersonation."
  },
  {
    "id": "beta-domain-takedown",
    "section": "Security",
    "subsection": "Token Calculator",
    "group": "Add-Ons",
    "question": "Domain Takedown Service (packs of 100)",
    "technicalOnly": true,
    "fieldType": "domainTakedownInput"
  },
  {
    "id": "beta-soc-insights",
    "section": "Security",
    "subsection": "Token Calculator",
    "group": "Add-Ons",
    "question": "SOC Insights",
    "technicalOnly": true,
    "fieldType": "socInsightsInput"
  },
  {
    "id": "beta-security-tokens-total",
    "section": "Security",
    "subsection": "Token Calculator",
    "question": "Summary Token Count",
    "technicalOnly": true,
    "fieldType": "tokenTotal"
  },
  {
    "id": "uddi-estimator",
    "section": "UDDI",
    "question": "UDDI Estimator",
    "technicalOnly": true,
    "fieldType": "uddiEstimator"
  },
  {
    "id": "ps-1",
    "section": "Professional Services",
    "question": "Are you interested in PS?",
    "technicalOnly": true,
    "fieldType": "yesno",
    "defaultValue": "Yes"
  },
  {
    "id": "ps-2",
    "section": "Professional Services",
    "question": "What is your comfort level on number of Go-Lives?",
    "technicalOnly": true,
    "fieldType": "number"
  },
  {
    "id": "ps-3",
    "section": "Professional Services",
    "question": "3rd Party Integrations",
    "technicalOnly": true,
    "fieldType": "multiselect",
    "options": [
      "NAC",
      "Vulnerability Scanner",
      "SIEM",
      "SOAR"
    ],
    "optionsWithVendor": [
      "NAC",
      "Vulnerability Scanner",
      "SIEM",
      "SOAR"
    ],
    "allowFreeform": true
  }
];
