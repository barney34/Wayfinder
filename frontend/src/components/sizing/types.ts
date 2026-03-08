export interface PlatformOption {
  value: string;
  label: string;
  infrastructure: string;
  haType: string;
}

export const platformOptions: PlatformOption[] = [
  { value: 'NIOS', label: 'NIOS Physical', infrastructure: '1 Physical Appliance', haType: 'None (Single Instance)' },
  { value: 'NIOS-V', label: 'NIOS Virtual', infrastructure: '1 Virtual Appliance', haType: 'None (Single Instance)' },
  { value: 'NIOS-PHA', label: 'NIOS Physical HA', infrastructure: '2 Physical Nodes (Active/Passive)', haType: 'Appliance-Level (Redundancy)' },
  { value: 'NIOS-VHA', label: 'NIOS Virtual HA', infrastructure: '2 Virtual Nodes (Active/Passive)', haType: 'Appliance-Level (Redundancy)' },
  { value: 'NXVS', label: 'NIOS-X VS', infrastructure: '1 Server (Host)', haType: 'None (Single Server)' },
  { value: 'NXaaS', label: 'NXaaS', infrastructure: 'Infrastructure-Free', haType: 'Service-Level (Cloud-Native)' },
];
