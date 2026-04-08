// src/lib/jobberFetchers.ts
//
// Single-record fetch helpers for the webhook dispatcher. Each function
// builds a `query { entity(id: $id) { ...FIELDS } }` query using the
// shared field constants from jobberMappers.ts and calls jobberGraphQL.
//
// jobberGraphQL throws on error, so callers should wrap in try/catch.
// Returns null if Jobber returns no data (e.g. entity was deleted between
// the webhook firing and our fetch).

import { jobberGraphQL } from "@/lib/jobberGraphQL";
import {
  JOB_FIELDS,
  VISIT_FIELDS,
  INVOICE_FIELDS,
  QUOTE_FIELDS,
  REQUEST_FIELDS,
  PAYMENT_FIELDS,
  type JobNode,
  type VisitNode,
  type InvoiceNode,
  type QuoteNode,
  type RequestNode,
  type PaymentNode,
} from "@/lib/jobberMappers";

type SingleResponse<K extends string, T> = { [P in K]: T | null };

async function fetchOne<K extends string, T>(
  token: string,
  resourceName: K,
  id: string,
  fields: string,
): Promise<T | null> {
  const query = `query($id: EncodedId!) {
    ${resourceName}(id: $id) {
      ${fields}
    }
  }`;
  const data = await jobberGraphQL<SingleResponse<K, T>>(token, query, { id });
  return data?.[resourceName] ?? null;
}

export function fetchJob(token: string, id: string) {
  return fetchOne<"job", JobNode>(token, "job", id, JOB_FIELDS);
}

export function fetchVisit(token: string, id: string) {
  return fetchOne<"visit", VisitNode>(token, "visit", id, VISIT_FIELDS);
}

export function fetchInvoice(token: string, id: string) {
  return fetchOne<"invoice", InvoiceNode>(token, "invoice", id, INVOICE_FIELDS);
}

export function fetchQuote(token: string, id: string) {
  return fetchOne<"quote", QuoteNode>(token, "quote", id, QUOTE_FIELDS);
}

export function fetchRequest(token: string, id: string) {
  return fetchOne<"request", RequestNode>(token, "request", id, REQUEST_FIELDS);
}

export function fetchPayment(token: string, id: string) {
  return fetchOne<"payment", PaymentNode>(token, "payment", id, PAYMENT_FIELDS);
}
