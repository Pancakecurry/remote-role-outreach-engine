# Public contact discovery policy

Evidence hierarchy: explicit job-posting email; official careers/contact/team/about text; official `mailto`; generic company hiring inbox; founder official site; public GitHub profile; all else. Every candidate stores exact URL, source type, quoted context, domains, match result, timestamp, confidence, and rejection reasons.

| Outcome | Conditions |
| --- | --- |
| Automatic-send eligible | Explicit public company-domain email, approved official source, valid syntax, MX present, fit/remote pass, unsuppressed, no recent company contact, daily quota available |
| Manual review | Founder official site, public GitHub email, third-party/unstructured evidence, medium identity match |
| Rejected | Inferred pattern, free-mail address, no URL, mismatch, no MX, LinkedIn/data broker source, suppression, bounce, or opt-out |

`jobs@`, `careers@`, `hiring@`, `talent@`, and `recruitment@` are eligible only when explicit on the official company domain. Example fixture domains are always rejected from production eligibility.
