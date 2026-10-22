# Preview source scanner coverage

This active public repository uses the accepted public organization helper at
`f83277823665d59b2a31cab6824bedf4f162cfdd`. Its GitLeaks and Trivy jobs always run on
GitHub-hosted Ubuntu with read-only source access. The caller supplies no inputs,
secrets, private reusable source, or self-hosted runner access.

Pull requests, main pushes and manual dispatch run the scanners. A metadata-only
PR edit is skipped unless its target branch changes. GitLeaks scans current source
with redaction and ignores inline allow comments. Trivy scans high and critical
vulnerabilities, secrets and misconfiguration; unfixed vulnerabilities are excluded
by the shared policy. This is not complete historical or unfixed-vulnerability
coverage. Policy-file edits and newly added inline Trivy exclusions require a
separate reviewed policy transition.

Only counts enter the helper summary. Private temporary reports are removed, and
invalid or unavailable scans fail. Findings require source-bound triage; this
adoption does not add a suppression or alter required branch checks.

The existing Preview verification and protected main deployment are unchanged.
This scanner source change does not authorize deployment. A main integration also
triggers the existing Pages deployment, so that consequence must be settled before
merging. Scanner execution and acceptance are pending actual candidate CI.
