import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Paginated fetch that works around Supabase PostgREST max_rows limit.
 * Fetches all rows in batches using .range().
 */
export async function fetchAllRows(
  table: string,
  select: string,
  connectionId: string,
  pageSize = 1000,
): Promise<any[]> {
  const allRows: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(select)
      .eq("connection_id", connectionId)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allRows;
}
