export interface DnsRecord {
  domain: string;
  address: string;
}

export interface KeeneticConfig {
  host: string;
  login: string;
  password: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DnsRecordsResponse {
  records: DnsRecord[];
}
