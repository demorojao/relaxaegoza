---
name: secure-supabase-schema
description: Use whenever creating or modifying Supabase database schemas to prevent critical security flaws. Enforces strict rules on RLS UPDATE policies, Security Definer search paths, Foreign Key indexes, and Column Tampering.
metadata:
  author: antigravity
  version: "1.0.0"
---

# Secure Supabase Schema Design

This skill exists to ensure that we **never** create a database with critical security or performance flaws. You MUST follow these rules when writing or modifying `schema.sql` or any database migrations.

## 1. RLS UPDATE Policies MUST include `WITH CHECK`
When creating an `UPDATE` policy using Postgres RLS, always include `WITH CHECK` to prevent Privilege Escalation or Account Takeover (IDOR). Without `WITH CHECK`, a user can update restricted data (like changing `id` to someone else's ID) as long as the old data passed the `USING` clause.

**INCORRECT:**
```sql
CREATE POLICY "Users can update their profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
```

**CORRECT:**
```sql
CREATE POLICY "Users can update their profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);
```

## 2. Protect Sensitive Columns (Column Tampering)
If a table has sensitive columns (like `subscription_tier`, `is_verified`, `role`, `balance`), you MUST prevent users from updating them directly, even if they own the row. RLS Table-Level `UPDATE` policies allow the user to modify ALL columns.

**Rule**: Use a `BEFORE UPDATE` trigger to lock these columns from client-side modifications.

**CORRECT:**
```sql
CREATE OR REPLACE FUNCTION public.protect_sensitive_fields()
RETURNS trigger AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.subscription_tier = OLD.subscription_tier;
    NEW.is_verified = OLD.is_verified;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_protect_sensitive_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_fields();
```

## 3. SECURITY DEFINER Functions MUST set `search_path`
Any Postgres function defined with `SECURITY DEFINER` executes with the privileges of its creator, bypassing RLS. If you don't secure the `search_path`, an attacker could hijack the execution path by creating malicious objects in their own schema.

**INCORRECT:**
```sql
CREATE FUNCTION my_func() RETURNS trigger AS $$ ... $$ LANGUAGE plpgsql SECURITY DEFINER;
```

**CORRECT:**
```sql
CREATE FUNCTION my_func() RETURNS trigger AS $$ ... $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

## 4. Foreign Keys MUST have Indexes
PostgreSQL does not create indexes on Foreign Keys automatically. Without indexes, deleting a parent row will cause a Full Table Scan on the child table, leading to severe performance degradation and database locks.

**Rule**: Every `REFERENCES` must have a corresponding `CREATE INDEX`.

**CORRECT:**
```sql
CREATE TABLE public.posts (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_posts_user_id ON public.posts(user_id);
```

## Conclusion
Always apply these 4 checks to EVERY schema file or migration script you write. Failure to do so introduces critical vulnerabilities.
