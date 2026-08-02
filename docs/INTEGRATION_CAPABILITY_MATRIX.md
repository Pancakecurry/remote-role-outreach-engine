# Integration capability matrix

| Capability | Access | Credentials | Current state | Tested phase | Failure fallback |
| --- | --- | --- | --- | --- | --- |
| Gemini structured output | Write request | Gemini key/model | Contract/preflight only | 1 | Skip and mark unavailable |
| Supabase browser access | Read/write via RLS | publishable key | Not configured | 2 | CRM offline state |
| Supabase automation access | Read/write server-side | secret key | Contract only | 2 | Log failed run |
| Public ATS retrieval | Read | none or provider rules | Disabled | 3 | Manual source review |
| Public HTML extraction | Read | none | Synthetic-only | 1 | Preserve no-contact state |
| DNS MX lookup | Read | none | Local contract/preflight | 1 | Mark validation unresolved |
| Gmail OAuth | Read/write | OAuth | Disabled | 7 | Keep draft/sequence blocked |
| Gmail sending | Write | OAuth | Disabled | 7 | No send |
| Gmail thread retrieval | Read | OAuth | Disabled | 8 | Pause sequence |
| Gmail reply monitoring | Read | OAuth | Disabled | 8 | Manual review |
| n8n scheduling | Write orchestration | n8n env | Compose contract only | 1 | No automation |
