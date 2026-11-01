Payment models are appended to schema.prisma. They require a reviewed migration generated
with Prisma after dependencies are available; no migration has been applied.
Amounts are AUD minor units, never floating point. No wallet balance is credited.
Use separate migration and runtime DB users. Revoke UPDATE/DELETE on AuditEvent and
PaymentEvent for the runtime role, and restrict product/approval writes to a separate
operations role. Back up and test restore before applying to production.
