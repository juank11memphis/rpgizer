# Business Domain Model

## Document Control & Context

### Executive Summary / Purpose

RPGizer turns a real-life goal into a playable Adventure: a structured, RPG-style roadmap that helps the user take action one focused step at a time.

The business domain is not generic task management. It is the transformation of an unclear or overwhelming ambition into an Adventure with Acts, Main Quests, Side Quests, Boss Fights, Skills, Inventory, Achievements, and visible progression. The core value is momentum: helping the user complete real actions toward something they want to do.

### Domain Scope & Boundaries

In scope for the business model:

- Visitors who encounter RPGizer through the public product introduction before signing in or starting an Adventure.
- Google-authenticated Users who own Adventures.
- A Game Master that interviews users, generates Adventures, explains the roadmap, and helps revise it through user-triggered conversation.
- Adventures that move from interview to generated roadmap to active progress.
- Roadmaps made of Acts, Main Quests, Side Quests, Boss Fights, Skills, Inventory Items, and Achievements.
- Manual completion of Quests and Boss Fights.
- Manual acquisition of Inventory Items.
- Skill XP and leveling driven primarily by Quest and Boss completion.
- Achievements unlocked automatically from meaningful progress.
- Targeted roadmap updates through the Game Master.
- A public entry point that explains the RPGizer promise, shows the RPG-native value, and invites Visitors to start an Adventure.

Out of scope for the initial domain model:

- A cross-adventure player character profile.
- A generic regenerate button for whole-roadmap replacement.
- Corporate project management, OKRs, team workflows, or task assignment.
- Expert medical, legal, financial, or safety advice.

## Ubiquitous Language

### Terms and Definitions

| Term | Definition |
| --- | --- |
| Visitor | A person evaluating RPGizer through the public landing experience before they become an authenticated User or start an Adventure. |
| User | A Google-authenticated person who owns and progresses through Adventures. |
| Goal | The real-life outcome the User wants to achieve. A Goal is the raw ambition before RPGizer turns it into an Adventure. |
| Adventure | The playable container for a Goal. It includes the interview context, generated roadmap, progression, edits, Skills, Inventory, Achievements, and current state. |
| Game Master | The AI assistant role and product guide. It interviews the User, decides when enough context exists, generates the Adventure, explains the roadmap, and helps revise specific parts when the User asks. |
| Interview | A one-question-at-a-time discovery flow led by the Game Master to understand enough context to generate a useful Adventure. |
| Readiness Threshold | The point where the Game Master has enough information to generate a specific, actionable Adventure. If the threshold is not met, the Interview continues. |
| Roadmap | The generated RPG-style plan inside an Adventure. It organizes real-world progress into Acts, Quests, Boss Fights, Skills, Inventory, and Achievements. |
| Act / Phase | A major chapter of the Adventure. Acts group related progress and often culminate in a Boss Fight. |
| Main Quest | A required milestone on the critical path to the Goal. |
| Side Quest | An optional but meaningful action that builds momentum, Skill, context, readiness, or delight. Side Quests should be interesting, not filler. |
| Boss Fight | A major challenge milestone that proves readiness to move into a new Act or complete a major part of the Adventure. Boss Fights are first-class RPG elements. |
| Quest | A general term for a Main Quest or Side Quest. Boss Fights are related progress units but have special milestone meaning. |
| Skill | An Adventure-specific real-life capability the User is building. Quests and Boss Fights award XP to one or more Skills. |
| Skill XP | Progress points awarded to Skills, primarily when Quests or Boss Fights are completed. |
| Skill Level | A visible stage of growth in an Adventure-specific Skill. Leveling up should communicate real-world capability growth. |
| Inventory | The Adventure-specific collection of tools, resources, materials, documents, accounts, or supplies that help the User progress. |
| Inventory Item | A practical item the User may need or benefit from acquiring, such as a chef knife, cutting board, notebook, software account, gym shoes, or travel document. |
| Achievement | An automatically unlocked recognition of meaningful progress patterns, such as completing key quests, acquiring important inventory, defeating a Boss Fight, or leveling Skills. |
| Adventure Detail Page | The place where the User reviews, follows, edits, and discusses an Adventure after generation. |
| Roadmap Update | A targeted change to an Adventure made by the Game Master after the User asks for help adjusting a specific part. |
| Landing Page | The public entry point that introduces RPGizer, communicates the playable-goal promise, and invites a Visitor to start an Adventure. |

### Synonym Clarification

- “Goal” is the desired real-world outcome; “Adventure” is the playable RPG-shaped version of that goal.
- “Roadmap” is the plan structure inside an Adventure, not a generic project plan.
- “Quest” may refer to Main Quests and Side Quests collectively. Boss Fights are special milestone challenges and should not be treated as ordinary tasks.
- “Inventory” means real-world readiness items, not random fantasy loot.
- “Game Master” is the AI assistant role, not a human coach or expert advisor.
- “Visitor” is a pre-auth/public-site role; “User” is an authenticated Adventure owner.

## Bounded Contexts & Subdomains

### Subdomains

Core subdomains:

- **Adventure Creation**: starting an Adventure, running the Interview, reaching readiness, and generating the Roadmap.
- **Adventure Progression**: completing Quests and Boss Fights, acquiring Inventory Items, unlocking Achievements, and leveling Skills.
- **Game Master Assistant**: the AI assistant role across the Adventure lifecycle: interviewing, generating, explaining, and helping update the Roadmap through user-triggered conversation.

Supporting subdomains:

- **Public Product Introduction**: public-facing product explanation that helps Visitors understand the RPGizer promise and decide to start an Adventure.
- **User Identity**: Google-authenticated Users who own Adventures.
- **Adventure Presentation**: Adventure Detail Page concepts that make the generated roadmap reviewable and actionable.
- **Safety & Trust**: boundaries around high-stakes goals and AI-generated guidance.

Generic or external domains:

- Google authentication.
- LLM generation and conversation.
- External expert domains such as medicine, law, finance, travel regulations, or safety-critical instruction.

### Context Map

```mermaid
flowchart TB
  subgraph ProductDomain["RPGizer Product Domain"]
    direction TB

    subgraph Core["Core Subdomains"]
      Creation["Adventure Creation"]
      Progression["Adventure Progression"]
      Adaptation["Game Master Assistant"]
    end

    subgraph Supporting["Supporting Subdomains"]
      PublicIntro["Public Product Introduction"]
      Identity["User Identity"]
      Presentation["Adventure Presentation"]
      Trust["Safety & Trust"]
    end
  end

  subgraph ProjectOwned["Project-Owned Outputs"]
    Landing["Landing Page"]
    Adventure["Adventure"]
    Roadmap["RPG Roadmap"]
    Progress["Progress State"]
  end

  subgraph External["External / Generic Domains"]
    Google["Google Auth"]
    LLM["LLM Provider"]
    Expert["Expert Advice Domains"]
  end

  PublicIntro --> Landing
  PublicIntro --> Creation
  Identity --> Creation
  Creation --> Adventure
  Creation --> Roadmap
  Progression --> Progress
  Adaptation --> Roadmap
  Presentation --> Adventure
  Trust -. constrains .-> Creation
  Trust -. constrains .-> Adaptation
  Google --> Identity
  LLM --> Creation
  LLM --> Adaptation
  ProductDomain -. does not replace .-> Expert
```

## Domain Concepts & Conceptual Diagram

### Conceptual Entities / Objects

- **Visitor** can encounter the Landing Page before becoming a User or starting an Adventure.
- **Landing Page** presents RPGizer's promise and directs a Visitor toward starting an Adventure.
- **User** owns zero or more Adventures.
- **Adventure** belongs to one User and represents one Goal.
- **Adventure** has one current lifecycle state.
- **Adventure** has one Roadmap after generation.
- **Roadmap** contains one or more Acts.
- **Act** contains Main Quests, Side Quests, and usually a Boss Fight.
- **Quest** belongs to an Act and can award XP to one or more Skills.
- **Boss Fight** belongs to an Act and awards meaningful XP and progress when completed.
- **Skill** belongs to one Adventure and gains XP from completed progress units.
- **Inventory Item** belongs to one Adventure and may be referenced by Quests or Boss Fights.
- **Achievement** belongs to one Adventure and unlocks automatically from progress patterns.
- **Game Master Conversation** belongs to one Adventure and can produce targeted Roadmap Updates.

```mermaid
flowchart TB
  Visitor["Visitor"] -->|views| Landing["Landing Page"]
  Landing -->|invites start| Adventure["Adventure"]
  User["User"] -->|owns| Adventure["Adventure"]
  Adventure -->|is based on| Goal["Goal"]
  Adventure -->|clarified by| Interview["Interview"]
  Adventure -->|guided by| GM["Game Master"]
  Adventure -->|contains| Roadmap["Roadmap"]
  Roadmap -->|organized into| Act["Acts / Phases"]
  Act --> MainQuest["Main Quests"]
  Act --> SideQuest["Side Quests"]
  Act --> Boss["Boss Fights"]
  Adventure --> Skill["Skills"]
  Adventure --> Inventory["Inventory"]
  Adventure --> Achievement["Achievements"]
  MainQuest -->|awards XP to| Skill
  SideQuest -->|awards XP to| Skill
  Boss -->|awards XP to| Skill
  Inventory --> Item["Inventory Items"]
  MainQuest -. may require .-> Item
  SideQuest -. may use .-> Item
  Boss -. may require .-> Item
  Achievement -. unlocks from .-> MainQuest
  Achievement -. unlocks from .-> Boss
  Achievement -. unlocks from .-> Skill
  Achievement -. unlocks from .-> Item
```

### Attributes / Characteristics

- Visitor: public-site role, interest in the RPGizer promise, intent to learn or start.
- Landing Page: public promise, RPG-native value explanation, examples, trust framing, and calls to start an Adventure.
- Adventure: title, Goal, current state, generated tone/theme, Acts, progress summary, Game Master context.
- Interview: ordered questions and answers, readiness status, missing context, safety concerns if any.
- Quest: title, description, type, Act, completion state, concrete done condition, linked Skills, optional Inventory references.
- Boss Fight: title, description, Act, completion state, challenge purpose, done condition, linked Skills and Inventory.
- Skill: name, real-world capability meaning, XP, level, progress explanation.
- Inventory Item: name, practical purpose, required/recommended status, acquired state, linked Quests or Boss Fights.
- Achievement: name, unlock condition, unlocked state, progress meaning.

### Relationships & Cardinality

- One Visitor may become one User by authenticating or starting the Adventure flow.
- One Landing Page can introduce many Visitors to RPGizer.
- One User can have many Adventures.
- One Adventure has one Goal, but that Goal may be refined during the Interview or later Game Master conversation.
- One Adventure has many Acts once generated.
- One Act has many progress units and may culminate in one or more Boss Fights.
- One Quest can award XP to multiple Skills.
- One Skill can receive XP from many Quests and Boss Fights.
- One Inventory Item can support many Quests or Boss Fights.
- One Achievement can depend on multiple progress signals.

## Domain Invariants & Business Rules

### Invariants

- The Landing Page must invite action without pretending that a Visitor has already created an Adventure.
- Public RPG flavor must make RPGizer feel exciting while keeping the product promise clear.
- Every Adventure must belong to a User.
- Every Adventure must be tied to a real-life Goal.
- The Game Master must ask one focused Interview question at a time.
- The Game Master must keep asking until the Adventure has enough context to be specific and actionable.
- Every generated RPG element must connect back to real-world progress.
- Every Quest and Boss Fight must have a concrete enough done condition that the User can tell when it is complete.
- Main Quests must represent required critical-path progress.
- Side Quests must be optional but meaningful; they must not be filler.
- Boss Fights are first-class milestones, not optional flavor labels.
- Skills are specific to an Adventure in the MVP.
- Inventory Items must be practical readiness items, not meaningless loot.
- Achievements are unlocked automatically from meaningful progress.
- Quest and Boss completion are manually triggered by the User.
- Inventory acquisition is manually marked by the User.
- The main progress and XP loop centers on Quest and Boss completion.
- Roadmap Updates through the Game Master should be targeted by default and preserve the larger Adventure unless the User asks for a broader rethink.
- RPG flavor must not obscure actionability.
- RPGizer must not present high-stakes guidance as expert advice.

### Policies

- When a Visitor chooses to start an Adventure, the product should move them into the Adventure Creation flow.
- When the User starts an Adventure, the Game Master begins an Interview rather than generating immediately.
- When the Interview lacks enough context, the Game Master asks another focused question.
- When the readiness threshold is met, the Game Master generates the Adventure Roadmap.
- When a Quest is completed, the Adventure updates progress and awards Skill XP.
- When a Boss Fight is completed, the Adventure records a major milestone and awards meaningful Skill XP.
- When Skill XP crosses a threshold, the Skill levels up.
- When an Achievement condition is met, the Achievement unlocks automatically.
- When an Inventory Item is acquired, the Adventure records readiness progress and may unlock an Achievement.
- When the User asks to change part of a Roadmap, the Game Master proposes or applies a targeted update.
- When the User’s goal touches expert or high-stakes domains, the Game Master should keep guidance structural, safe, and non-authoritative.

## Domain Events & Behaviors

### Key Lifecycle Triggers

Adventure states:

- **Drafting**: Interview is in progress and the Adventure is not ready to generate.
- **Generated**: Roadmap exists and the User can start.
- **In Progress**: The User has started completing Quests, Boss Fights, or acquiring Inventory.
- **Completed**: The Adventure’s Goal has been reached or the final Boss Fight is complete.
- **Archived**: The User no longer wants the Adventure active.

### Domain Events

- Visitor Invited to Start Adventure
- User Authenticated
- Adventure Started
- Interview Question Asked
- Interview Answered
- Adventure Ready to Generate
- Adventure Generated
- Quest Completed
- Boss Fight Completed
- Inventory Item Acquired
- Skill XP Awarded
- Skill Leveled Up
- Achievement Unlocked
- Roadmap Update Requested
- Roadmap Updated by Game Master
- Adventure Completed
- Adventure Archived

The most important momentum event is **Quest Completed**. It proves RPGizer is helping a User turn a plan into action.

## Out of Scope & Future Evolution

### Assumptions

- MVP includes a public landing entry point before authentication or Adventure ownership.
- MVP uses Google auth.
- MVP Adventures are mostly self-contained.
- A cross-adventure character/player profile is future evolution.
- Whole-roadmap regeneration is not an MVP concept; roadmap changes happen through user-triggered Game Master conversation.
- Skill XP values and leveling can be generated and adjusted by the system, but the User-facing meaning matters more than perfect numerical balance.
- Inventory contributes to readiness and may unlock Achievements, but should not replace Quest and Boss completion as the main progress loop.

### Known Variations / Debt

- Goal categories may eventually need specialized patterns, especially for travel, learning, health, career, creative projects, and product building.
- Boss Fight design may need careful tuning so milestones feel challenging without becoming intimidating.
- Side Quest quality is a hard product problem: they must feel optional, interesting, and useful, not like leftovers from the main plan.
- The Game Master role may later need a stronger character identity, name, or lore.
- High-stakes goals will require clear safety policies and disclaimers.
- Inventory could evolve into richer readiness tracking, shopping/checklists, or integrations, but should remain grounded in real-world usefulness.
