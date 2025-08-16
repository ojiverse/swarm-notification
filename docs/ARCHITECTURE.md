# Infrastructure Architecture

## Overview

This document describes the Google Cloud Platform infrastructure architecture for the Swarm API Real-time Integration project. The design prioritizes simplicity, security, and cost-effectiveness for the initial debug-user implementation.

## High-Level Architecture

```mermaid
graph TB
    subgraph "External Services"
        FS[Foursquare API<br/>Real-time Push]
        DC[Discord<br/>Webhook]
    end
    
    subgraph "Google Cloud Platform"
        subgraph "Compute"
            CR[Cloud Run<br/>Swarm API Service]
        end
        
        subgraph "Security & Secrets"
            SM[Secret Manager<br/>- DEBUG_ACCESS_TOKEN<br/>- DISCORD_WEBHOOK_URL<br/>- FOURSQUARE_PUSH_SECRET]
        end
        
        subgraph "Observability"
            CL[Cloud Logging<br/>- Application logs<br/>- Security audit logs<br/>- Error tracking]
            CM[Cloud Monitoring<br/>- Request metrics<br/>- Error rate alerts<br/>- Performance monitoring]
        end
        
        subgraph "Registry"
            AR[Artifact Registry<br/>- Container images<br/>- Build artifacts]
        end
    end
    
    FS -->|POST /webhook/checkin| CR
    CR -->|POST notification| DC
    CR -->|Read secrets| SM
    CR -->|Write logs| CL
    CR -->|Send metrics| CM
    AR -->|Pull image| CR
    
    classDef external fill:#e1f5fe
    classDef compute fill:#f3e5f5
    classDef security fill:#e8f5e8
    classDef observability fill:#fff3e0
    classDef registry fill:#fce4ec
    
    class FS,DC external
    class CR compute
    class SM security
    class CL,CM observability
    class AR registry
```

## Request Flow

```mermaid
sequenceDiagram
    participant FS as Foursquare API
    participant CR as Cloud Run
    participant SM as Secret Manager
    participant CL as Cloud Logging
    participant DC as Discord
    
    FS->>+CR: POST /webhook/checkin
    Note over CR: Validate payload structure
    CR->>+SM: Get FOURSQUARE_PUSH_SECRET
    SM-->>-CR: Return secret
    Note over CR: Verify webhook signature
    Note over CR: Check user authentication
    CR->>+CL: Log security event
    CL-->>-CR: Acknowledged
    CR->>+SM: Get DISCORD_WEBHOOK_URL
    SM-->>-CR: Return webhook URL
    CR->>+DC: POST notification
    DC-->>-CR: 200 OK
    CR->>+CL: Log success
    CL-->>-CR: Acknowledged
    CR-->>-FS: 200 OK
```

## Component Details

### Cloud Run Service

```mermaid
graph LR
    subgraph "Cloud Run Container"
        subgraph "Application"
            H[Hono Framework]
            subgraph "Routes"
                AR[Auth Routes<br/>/auth/swarm/*]
                WR[Webhook Routes<br/>/webhook/*]
                MR[Main Routes<br/>/*]
            end
            subgraph "Services"
                AS[Auth Service<br/>Token validation]
                WS[Webhook Service<br/>Payload processing]
                OS[OAuth Service<br/>Token exchange]
            end
        end
        
        subgraph "Middleware"
            LM[Logging Middleware]
            CM[CORS Middleware]
        end
    end
    
    H --> AR
    H --> WR
    H --> MR
    AR --> AS
    WR --> WS
    AR --> OS
    H --> LM
    H --> CM
```

**Configuration:**
- **CPU**: 1 vCPU (auto-scaling)
- **Memory**: 512MB
- **Min instances**: 0 (cost optimization)
- **Max instances**: 10
- **Timeout**: 60 seconds
- **Port**: 8080

### Security Architecture

```mermaid
graph TD
    subgraph "Security Layers"
        subgraph "Network Security"
            HTTPS[HTTPS Only<br/>TLS 1.2+]
            IAM[IAM Policies<br/>Least Privilege]
        end
        
        subgraph "Application Security"
            AUTH[Authentication<br/>Debug User Only]
            VAL[Input Validation<br/>Zod Schemas]
            SAN[Log Sanitization<br/>No Secret Exposure]
        end
        
        subgraph "Secret Management"
            SM[Secret Manager<br/>Encrypted at Rest]
            ROT[Secret Rotation<br/>Manual/Scheduled]
        end
    end
    
    subgraph "Audit & Monitoring"
        AL[Audit Logs<br/>Access Tracking]
        MT[Metrics<br/>Security Events]
        ALT[Alerts<br/>Anomaly Detection]
    end
    
    HTTPS --> AUTH
    IAM --> SM
    AUTH --> VAL
    VAL --> SAN
    SM --> ROT
    AUTH --> AL
    VAL --> MT
    AL --> ALT
```

### Data Flow

```mermaid
flowchart TD
    Start([Foursquare Check-in]) --> Webhook[Receive Webhook]
    Webhook --> Parse[Parse Payload]
    Parse --> ValidateFormat{Valid Format?}
    ValidateFormat -->|No| ErrorLog[Log Error]
    ValidateFormat -->|Yes| ValidateAuth{Authenticated User?}
    ValidateAuth -->|No| SecurityLog[Log Security Event]
    ValidateAuth -->|Yes| ProcessPayload[Process Check-in]
    ProcessPayload --> FormatMessage[Format Discord Message]
    FormatMessage --> SendDiscord[Send to Discord]
    SendDiscord --> Success{Success?}
    Success -->|No| RetryLog[Log Retry]
    Success -->|Yes| SuccessLog[Log Success]
    
    ErrorLog --> Return200[Return 200 OK]
    SecurityLog --> Return200
    RetryLog --> Return200
    SuccessLog --> Return200
    
    classDef process fill:#e3f2fd
    classDef decision fill:#fff3e0
    classDef error fill:#ffebee
    classDef success fill:#e8f5e8
    
    class Parse,ProcessPayload,FormatMessage,SendDiscord process
    class ValidateFormat,ValidateAuth,Success decision
    class ErrorLog,SecurityLog,RetryLog error
    class SuccessLog success
```

## Deployment Architecture

```mermaid
graph LR
    subgraph "Development"
        DEV[Local Development<br/>pnpm dev]
        BUILD[Build Process<br/>Docker]
    end
    
    subgraph "CI/CD"
        GHA[GitHub Actions<br/>Build & Test]
        AR[Artifact Registry<br/>Store Images]
    end
    
    subgraph "Production"
        CR[Cloud Run<br/>Auto-deploy]
        SM[Secret Manager<br/>Runtime Config]
    end
    
    DEV --> BUILD
    BUILD --> GHA
    GHA --> AR
    AR --> CR
    SM --> CR
    
    classDef dev fill:#e8f5e8
    classDef cicd fill:#e3f2fd
    classDef prod fill:#fff3e0
    
    class DEV,BUILD dev
    class GHA,AR cicd
    class CR,SM prod
```

## Cost Optimization

```mermaid
graph TD
    subgraph "Cost Factors"
        subgraph "Compute Costs"
            CR_CPU[Cloud Run CPU<br/>Pay-per-request]
            CR_MEM[Cloud Run Memory<br/>512MB allocated]
        end
        
        subgraph "Storage Costs"
            AR_STORAGE[Artifact Registry<br/>Container images]
            LOG_STORAGE[Cloud Logging<br/>Log retention]
        end
        
        subgraph "Network Costs"
            EGRESS[Egress Traffic<br/>To Discord]
        end
    end
    
    subgraph "Optimization Strategies"
        MIN_ZERO[Min instances: 0<br/>Cold start acceptable]
        LOG_FILTER[Log filtering<br/>Reduce volume]
        IMAGE_OPT[Multi-stage builds<br/>Smaller images]
    end
    
    CR_CPU --> MIN_ZERO
    LOG_STORAGE --> LOG_FILTER
    AR_STORAGE --> IMAGE_OPT
```

## Future Extensions

```mermaid
graph TB
    subgraph "Phase 1: Current"
        CURRENT[Debug User Only<br/>Memory Storage<br/>Cloud Run]
    end
    
    subgraph "Phase 2: Multi-User"
        FS[(Firestore<br/>User tokens & settings)]
        OAUTH[Full OAuth Flow<br/>User management]
        AUTH[Authentication<br/>Session management]
    end
    
    CURRENT --> FS
    CURRENT --> OAUTH
    FS --> AUTH
    OAUTH --> AUTH
    
    classDef current fill:#e8f5e8
    classDef phase2 fill:#e3f2fd
    
    class CURRENT current
    class FS,OAUTH,AUTH phase2
```

## Security Considerations

### Authentication Flow

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    Unauthenticated --> OAuth_Start: /auth/swarm/login
    OAuth_Start --> Foursquare_Auth: Redirect
    Foursquare_Auth --> OAuth_Callback: Authorization code
    OAuth_Callback --> Token_Exchange: Exchange code
    Token_Exchange --> Token_Validation: Validate token
    Token_Validation --> Authenticated: Store in memory
    Authenticated --> [*]: Session end
    
    Token_Validation --> Unauthenticated: Invalid token
    OAuth_Callback --> Unauthenticated: Error
```

### Secret Management Strategy

```mermaid
graph LR
    subgraph "Secret Types"
        ACCESS[Access Tokens<br/>Short-lived]
        WEBHOOK[Webhook URLs<br/>Long-lived]
        SIGNING[Signing Secrets<br/>Rotation required]
    end
    
    subgraph "Storage Strategy"
        SM[Secret Manager<br/>Encrypted at rest]
        VERSION[Version control<br/>Rollback capability]
        ACCESS_CONTROL[IAM policies<br/>Principle of least privilege]
    end
    
    subgraph "Runtime Security"
        MEMORY[Memory encryption<br/>Process isolation]
        LOGGING[Sanitized logging<br/>No secret exposure]
        MONITORING[Access monitoring<br/>Audit trails]
    end
    
    ACCESS --> SM
    WEBHOOK --> SM
    SIGNING --> SM
    SM --> VERSION
    SM --> ACCESS_CONTROL
    VERSION --> MEMORY
    ACCESS_CONTROL --> LOGGING
    MEMORY --> MONITORING
```

## Resource Requirements

### Initial Deployment (Debug Phase)

| Resource | Configuration | Monthly Cost (Estimate) |
|----------|---------------|------------------------|
| Cloud Run | 1 vCPU, 512MB, ~100 requests/day | $0.50 |
| Secret Manager | 3 secrets, ~1000 accesses/month | $0.06 |
| Cloud Logging | ~1GB logs/month | $0.50 |
| Artifact Registry | ~500MB images | $0.05 |
| Cloud Monitoring | Basic metrics | Free tier |
| **Total** | | **~$1.11/month** |

### Phase 2 Scale (Multi-user with Firestore)

| Resource | Configuration | Monthly Cost (Estimate) |
|----------|---------------|------------------------|
| Cloud Run | 2 vCPU, 1GB, auto-scale | $30 |
| Firestore | 100GB storage, 1M operations | $20 |
| Secret Manager | 10 secrets, 100k accesses | $6 |
| Cloud Logging | 5GB logs | $2.50 |
| Artifact Registry | 1GB images | $0.10 |
| Cloud Monitoring | Standard metrics | $2 |
| **Total** | | **~$60/month** |

## Implementation Checklist

- [ ] Create Google Cloud project
- [ ] Enable required APIs (Cloud Run, Secret Manager, etc.)
- [ ] Set up IAM roles and service accounts
- [ ] Configure Secret Manager with production secrets
- [ ] Create Dockerfile for containerization
- [ ] Set up Cloud Build for CI/CD
- [ ] Configure Cloud Run service
- [ ] Set up monitoring and alerting
- [ ] Test end-to-end deployment
- [ ] Document operational procedures