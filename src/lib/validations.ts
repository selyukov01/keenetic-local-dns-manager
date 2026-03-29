import { z } from "zod";

// IPv4 address validation
export const ipv4Schema = z
  .string()
  .min(1, "IP address is required")
  .regex(
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    "Invalid IPv4 address format"
  );

// Domain name validation (hostname format)
// Supports: example.com, srv101, *.home.lab, sub.domain.local
export const domainSchema = z
  .string()
  .min(1, "Domain is required")
  .max(253, "Domain is too long")
  .regex(
    /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    "Invalid domain format"
  )
  .transform((val) => val.toLowerCase());

// DNS record schema
export const dnsRecordSchema = z.object({
  domain: domainSchema,
  address: ipv4Schema,
});

// Schema for creating/updating DNS record
export const createDnsRecordSchema = dnsRecordSchema;

export const updateDnsRecordSchema = z.object({
  oldDomain: z.string().min(1),
  newDomain: domainSchema,
  address: ipv4Schema,
});

// Settings schema
export const keeneticSettingsSchema = z.object({
  host: z
    .string()
    .min(1, "Router address is required")
    .regex(
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$/,
      "Invalid address format (IP or hostname)"
    ),
  login: z.string().min(1, "Login is required"),
  password: z.string().min(1, "Password is required"),
});

// --- Localized schema factories (for client-side use with i18n) ---

interface ValidationMessages {
  ipRequired: string;
  invalidIpFormat: string;
  domainRequired: string;
  domainTooLong: string;
  invalidDomainFormat: string;
  hostRequired: string;
  invalidHostFormat: string;
  loginRequired: string;
  passwordRequired: string;
  atLeastOneRecord: string;
}

export function createLocalizedIpv4Schema(t: ValidationMessages) {
  return z
    .string()
    .min(1, t.ipRequired)
    .regex(
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
      t.invalidIpFormat
    );
}

export function createLocalizedDomainSchema(t: ValidationMessages) {
  return z
    .string()
    .min(1, t.domainRequired)
    .max(253, t.domainTooLong)
    .regex(
      /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
      t.invalidDomainFormat
    )
    .transform((val) => val.toLowerCase());
}

export function createLocalizedDnsRecordSchema(t: ValidationMessages) {
  return z.object({
    domain: createLocalizedDomainSchema(t),
    address: createLocalizedIpv4Schema(t),
  });
}

export function createLocalizedMultiRecordSchema(t: ValidationMessages) {
  return z.object({
    records: z.array(createLocalizedDnsRecordSchema(t)).min(1, t.atLeastOneRecord),
  });
}

export function createLocalizedSettingsSchema(t: ValidationMessages) {
  return z.object({
    host: z
      .string()
      .min(1, t.hostRequired)
      .regex(
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$/,
        t.invalidHostFormat
      ),
    login: z.string().min(1, t.loginRequired),
    password: z.string().min(1, t.passwordRequired),
  });
}

// Type exports
export type DnsRecordInput = z.infer<typeof dnsRecordSchema>;
export type CreateDnsRecordInput = z.infer<typeof createDnsRecordSchema>;
export type UpdateDnsRecordInput = z.infer<typeof updateDnsRecordSchema>;
export type KeeneticSettingsInput = z.infer<typeof keeneticSettingsSchema>;
