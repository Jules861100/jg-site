-- Publishing a new current document version archives the previous one
-- atomically, so the uq_documents_current partial index is never violated.
create function publish_document(
  p_project_id uuid,
  p_kind text,
  p_file_path text
)
returns documents
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_org_id uuid := current_org_id();
  v_next_version int;
  v_doc documents;
begin
  update documents
  set is_current = false, status = 'archived'
  where project_id = p_project_id
    and kind = p_kind
    and is_current;

  select coalesce(max(version), 0) + 1 into v_next_version
  from documents
  where project_id = p_project_id and kind = p_kind;

  insert into documents (org_id, project_id, kind, version, file_path, status, is_current)
  values (v_org_id, p_project_id, p_kind, v_next_version, p_file_path, 'current', true)
  returning * into v_doc;

  return v_doc;
end;
$$;

revoke all on function publish_document(uuid, text, text) from public;
grant execute on function publish_document(uuid, text, text) to authenticated;
