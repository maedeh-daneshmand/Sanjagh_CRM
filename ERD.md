# ERD — CRM

Paste the diagram block into https://mermaid.live to view/export it as an image.

```mermaid
erDiagram
  USER ||--o{ SESSION : has
  USER ||--o{ CONTACT : "owns (assigned rep)"
  USER ||--o{ CONTACT : "created"
  USER ||--o{ DEAL : owns
  USER ||--o{ TASK : "assigned to"
  USER ||--o{ TASK : "created"
  USER ||--o{ ACTIVITY : performs
  USER ||--o{ CAMPAIGN : creates
  USER ||--o{ AUTOMATION : creates
  USER ||--o{ AI_SUGGESTION : "triggers"

  CONTACT ||--o{ DEAL : has
  CONTACT ||--o{ TASK : "related to"
  CONTACT ||--o{ ACTIVITY : timeline
  CONTACT ||--o{ MESSAGE : receives
  CONTACT ||--o{ AUTOMATION_RUN : "enrolled in"
  CONTACT ||--o{ AI_SUGGESTION : about
  CONTACT ||--o| AI_SUMMARY : cached

  DEAL ||--o{ TASK : has
  DEAL ||--o{ ACTIVITY : has
  DEAL ||--o{ AI_SUGGESTION : about

  CAMPAIGN ||--o{ MESSAGE : sends
  AUTOMATION ||--o{ AUTOMATION_RUN : executes
  AUTOMATION_RUN ||--o{ MESSAGE : sends

  USER {
    string id PK
    string name
    string phone UK
    string email
    enum role "ADMIN|MANAGER|SALES"
    bool isActive
  }
  CONTACT {
    string id PK
    enum kind "LEAD|CUSTOMER"
    string fullName
    string phone
    string email
    enum source
    enum leadStatus
    enum priority
    int score
    string ownerId FK
  }
  DEAL {
    string id PK
    string title
    decimal amount
    enum stage "6 stages"
    float position
    string contactId FK
    string ownerId FK
  }
  TASK {
    string id PK
    string title
    datetime dueAt
    enum status
    enum origin "SELF|MANAGER|AUTOMATION|AI"
    string assigneeId FK
    string contactId FK
  }
  ACTIVITY {
    string id PK
    enum type
    string body
    json meta
    string contactId FK
  }
  MESSAGE {
    string id PK
    enum channel "SMS|EMAIL"
    string toAddress
    enum status "QUEUED|SENT|FAILED"
    string campaignId FK
    string automationRunId FK
  }
  CAMPAIGN {
    string id PK
    string name
    enum channel
    json filter
    enum status
    int totalCount
    int sentCount
    int failedCount
  }
  AUTOMATION {
    string id PK
    string name
    bool isActive
    bool isPreset
    enum trigger
    json conditions
    json steps
  }
  AUTOMATION_RUN {
    string id PK
    enum status
    int currentStep
    json log
  }
  AI_SUGGESTION {
    string id PK
    enum type "CREATE_TASK|CHANGE_DEAL_STAGE|CHANGE_LEAD_STATUS"
    json payload
    enum status "PENDING|ACCEPTED|REJECTED"
  }
  AI_SUMMARY {
    string id PK
    string summary
    string risk
    string nextStep
  }
  SESSION {
    string id PK
    string userId FK
    datetime expiresAt
  }
```

## Design decisions (for the README)

1. **One `Contact` table** for leads and customers (`kind`). Conversion flips `kind`; history stays.
2. **`Activity` is the timeline** and the input for AI summaries and smart notes.
3. **OTP lives in Redis**, not in the database.
4. **Automations store steps as JSON**; the visual builder just edits that JSON.
5. **AI never writes directly**: it creates `AiSuggestion` rows (PENDING); applying happens only after user approval.
6. **Messages are always created as QUEUED** and sent by the BullMQ worker, so the UI never blocks on a provider.
