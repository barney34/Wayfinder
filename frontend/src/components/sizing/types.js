export const platformOptions = [
  { value: 'NIOS', label: 'NIOS', infrastructure: '1 Node (Physical or VM)', haType: 'None (Single Instance)' },
  { value: 'NIOS-HA', label: 'NIOS-HA', infrastructure: '2 Nodes (Active/Passive Pair)', haType: 'Appliance-Level (Redundancy)' },
  { value: 'NX', label: 'NIOS-X', infrastructure: '1 Server (Host)', haType: 'None (Single Server)' },
  { value: 'NXaaS', label: 'NXaaS', infrastructure: 'Infrastructure-Free', haType: 'Service-Level (Cloud-Native)' },
];
