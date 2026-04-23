# Mintlify Technical Writing Guide

A comprehensive reference for creating exceptional technical documentation using Mintlify components and industry-leading writing practices.

---

## Table of Contents

- [Core Writing Principles](#core-writing-principles)
- [Mintlify Components](#mintlify-components)
- [Content Quality Standards](#content-quality-standards)
- [Component Selection Guide](#component-selection-guide)
- [Quick Reference](#quick-reference)

---

## Core Writing Principles

### Language and Style

**Voice and Perspective**
- **Use second person** ("you") for all instructions and procedures to create direct engagement
- **Write in active voice** to make actions clear and sentences concise
  - ✅ "Click the Submit button" (active)
  - ❌ "The Submit button should be clicked" (passive)
- **Use present tense** for current states, future tense only for outcomes
  - ✅ "The API returns a JSON response"
  - ❌ "The API will return a JSON response"

**Clarity and Precision**
- **Use clear, direct language** appropriate for technical audiences without unnecessary complexity
- **Avoid jargon** unless it's standard in the field; define technical terms on first use
- **Maintain consistent terminology** throughout documentation (e.g., don't alternate between "endpoint" and "API route")
- **Keep sentences concise** while providing necessary context (aim for 15-25 words per sentence)
- **Use parallel structure** in lists, headings, and procedures for easier scanning

**Example of parallel structure:**
```markdown
Good (parallel):
- Install the package
- Configure the settings
- Start the server

Bad (not parallel):
- Install the package
- Configuration of settings
- The server should be started
```

### Content Organization

**Information Architecture**
- **Lead with key information** using inverted pyramid structure (most important first)
- **Use progressive disclosure** to introduce concepts from basic to advanced
- **Break complex procedures** into numbered steps with one action per step
- **Include prerequisites** before instructions so users can prepare
- **Provide expected outcomes** after major steps for verification
- **Use descriptive headings** that are keyword-rich for navigation and SEO

**Structural Best Practices**
- **Group related information** logically with clear section breaks
- **Chunk content** into digestible sections (3-7 items per list)
- **Create scannable pages** with headings, lists, and white space
- **Link to related topics** for deeper exploration without cluttering main content

### User-Centered Approach

**Focus on User Goals**
- **Write for outcomes** rather than features (what users can accomplish, not what the system does)
- **Anticipate questions** and address them proactively in the flow
- **Include troubleshooting** for likely failure points with specific solutions
- **Add verification steps** so users can confirm they've succeeded
- **Provide context** for why certain steps or practices matter

**Example of user-centered writing:**
```markdown
Instead of: "The API has authentication capabilities"
Write: "Authenticate your requests to access protected resources"
```

---

## Mintlify Components

### Configuration

#### docs.json Structure

The `docs.json` file controls your documentation site's navigation and configuration.

**Key elements:**
- Navigation structure and page organization
- Theme and branding settings
- Integration configurations (analytics, feedback, etc.)

Refer to the [docs.json schema](https://mintlify.com/docs.json) for complete configuration options.

```json
{
  "name": "Your Product",
  "navigation": [
    {
      "group": "Getting Started",
      "pages": ["introduction", "quickstart"]
    }
  ]
}
```

---

### Callout Components

Callouts draw attention to specific types of information. Use them sparingly to maintain impact.

#### Note - Supplementary Information

Use for helpful context that supports but doesn't interrupt the main narrative.

**When to use:**
- Additional context or background
- Related information worth knowing
- Non-critical explanations

```markdown
<Note>
This feature is available in all plans. Enterprise customers have additional customization options.
</Note>
```

#### Tip - Best Practices

Use for expert advice, shortcuts, or recommendations that enhance user success.

**When to use:**
- Pro tips and shortcuts
- Performance optimization suggestions
- Best practices and recommendations

```markdown
<Tip>
For faster development, enable hot reload in your configuration. This updates your app automatically when you save changes.
</Tip>
```

#### Warning - Critical Cautions

Use for important information about potential issues, breaking changes, or destructive actions.

**When to use:**
- Breaking changes or deprecations
- Potentially destructive operations
- Security concerns
- Common pitfalls with serious consequences

```markdown
<Warning>
Deleting your API key is permanent and will immediately revoke access for all applications using it.
</Warning>
```

#### Info - Neutral Context

Use for background information, updates, or neutral announcements.

**When to use:**
- Version information
- Contextual background
- Status updates
- Neutral announcements

```markdown
<Info>
This endpoint was introduced in API version 2.0 and is not available in earlier versions.
</Info>
```

#### Check - Success Confirmations

Use for positive confirmations and successful completions.

**When to use:**
- Verification of successful completion
- Expected outcomes achieved
- Confirmation indicators

```markdown
<Check>
Your API key is now active and ready to use in production.
</Check>
```

---

### Code Components

#### Single Code Block

Use for standalone code examples in a single language.

**Best practices:**
- Include the filename when relevant
- Add explanatory comments for complex logic
- Use realistic variable names and values
- Test all code before publishing

```markdown
```javascript config.js
const apiConfig = {
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Authorization': `Bearer ${process.env.API_TOKEN}`
  }
};
```
```

#### Code Group - Multi-Language Examples

Use when showing the same concept across different programming languages.

**When to use:**
- Cross-platform examples
- Language-specific implementations
- Multiple SDK examples

```markdown
<CodeGroup>
```javascript Node.js
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}` 
  },
  body: JSON.stringify({ name: 'John' })
});
const data = await response.json();
```

```python Python
import requests

response = requests.post(
  '/api/endpoint',
  headers={'Authorization': f'Bearer {api_key}'},
  json={'name': 'John'}
)
data = response.json()
```

```curl cURL
curl -X POST '/api/endpoint' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -d '{"name": "John"}'
```
</CodeGroup>
```

#### Request/Response Examples

Use specifically for API endpoint documentation to show complete request-response cycles.

**When to use:**
- API endpoint documentation
- HTTP request/response pairs
- Showing both success and error states

```markdown
<RequestExample>
```bash cURL
curl -X POST 'https://api.example.com/users' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin"
  }'
```
</RequestExample>

<ResponseExample>
```json Success (201 Created)
{
  "id": "user_abc123",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "admin",
  "created_at": "2024-01-15T10:30:00Z",
  "status": "active"
}
```

```json Error (400 Bad Request)
{
  "error": {
    "code": "INVALID_EMAIL",
    "message": "The email address provided is already in use",
    "field": "email"
  }
}
```
</ResponseExample>
```

---

### Structural Components

#### Steps - Sequential Procedures

Use for step-by-step instructions that must be followed in order.

**Best practices:**
- One action per step
- Include verification checks
- Show expected outcomes
- Add warnings for critical steps

```markdown
<Steps>
<Step title="Install dependencies">
  Install the required packages using npm or yarn:
  
  ```bash
  npm install @your-package/sdk
  ```
  
  <Check>
  Verify installation by running `npm list @your-package/sdk`. You should see version 2.0.0 or higher.
  </Check>
</Step>

<Step title="Configure environment variables">
  Create a `.env` file in your project root with your API credentials:
  
  ```bash
  API_KEY=your_api_key_here
  API_SECRET=your_api_secret_here
  ENVIRONMENT=production
  ```
  
  <Warning>
  Never commit API keys to version control. Add `.env` to your `.gitignore` file.
  </Warning>
</Step>

<Step title="Initialize the client">
  Import and initialize the SDK client in your application:
  
  ```javascript
  import { Client } from '@your-package/sdk';
  
  const client = new Client({
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET,
    environment: process.env.ENVIRONMENT
  });
  ```
  
  <Check>
  Test the connection by running `await client.ping()`. You should receive a success response.
  </Check>
</Step>
</Steps>
```

#### Tabs - Alternative Content

Use for platform-specific instructions or alternative approaches to the same task.

**When to use:**
- Operating system-specific commands
- Different framework implementations
- Alternative configuration methods

```markdown
<Tabs>
<Tab title="macOS">
  Install via Homebrew for the easiest setup:
  
  ```bash
  brew install node
  brew install postgresql
  npm install -g @your-package/cli
  ```
</Tab>

<Tab title="Windows">
  Install using Chocolatey package manager:
  
  ```powershell
  choco install nodejs
  choco install postgresql
  npm install -g @your-package/cli
  ```
</Tab>

<Tab title="Linux (Ubuntu/Debian)">
  Install using apt package manager:
  
  ```bash
  sudo apt update
  sudo apt install nodejs npm postgresql
  npm install -g @your-package/cli
  ```
</Tab>
</Tabs>
```

#### Accordions - Collapsible Content

Use for progressive disclosure of supplementary information that shouldn't clutter the main flow.

**When to use:**
- Troubleshooting sections
- Advanced configuration options
- FAQ sections
- Optional deep dives

```markdown
<AccordionGroup>
<Accordion title="Troubleshooting connection errors">
  If you're experiencing connection issues, try these solutions:
  
  **Firewall configuration**
  - Ensure ports 80 (HTTP) and 443 (HTTPS) are open
  - Check if corporate firewall rules allow outbound connections
  
  **Proxy settings**
  - Set the `HTTP_PROXY` and `HTTPS_PROXY` environment variables:
    ```bash
    export HTTP_PROXY=http://proxy.company.com:8080
    export HTTPS_PROXY=http://proxy.company.com:8080
    ```
  
  **DNS resolution**
  - Try using Google's DNS servers (8.8.8.8 and 8.8.4.4)
  - Flush your DNS cache: `sudo dscacheutil -flushcache` (macOS)
</Accordion>

<Accordion title="Advanced configuration options">
  For fine-tuned control, configure these advanced settings:
  
  ```javascript
  const config = {
    performance: {
      cache: true,
      cacheTimeout: 3600, // 1 hour in seconds
      timeout: 30000,     // 30 seconds
      retries: 3
    },
    security: {
      encryption: 'AES-256-GCM',
      tlsVersion: '1.3',
      validateCertificates: true
    },
    logging: {
      level: 'info',
      format: 'json',
      destination: '/var/log/app.log'
    }
  };
  ```
  
  <Warning>
  Modifying security settings can expose your application to vulnerabilities. Only change these if you understand the implications.
  </Warning>
</Accordion>

<Accordion title="Rate limit optimization">
  Maximize your API usage with these rate limit strategies:
  
  - **Batch requests** when possible to reduce call count
  - **Implement exponential backoff** for retry logic
  - **Cache responses** for frequently accessed data
  - **Monitor headers** like `X-RateLimit-Remaining` to track usage
  
  ```javascript
  // Example: Exponential backoff implementation
  async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fetch(url);
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
      }
    }
  }
  ```
</Accordion>
</AccordionGroup>
```

---

### Cards - Visual Navigation

Use cards to create visually appealing navigation or highlight important resources.

**When to use:**
- Homepage navigation
- Feature highlights
- Resource collections
- Guide sections

#### Single Card

```markdown
<Card title="Quick Start Guide" icon="rocket" href="/quickstart">
Get up and running in under 10 minutes with our comprehensive quick start tutorial covering installation, authentication, and your first API call.
</Card>
```

#### Card Group

```markdown
<CardGroup cols={2}>
<Card title="Authentication Guide" icon="key" href="/auth">
  Learn how to authenticate your API requests using API keys, OAuth 2.0, or JWT tokens.
</Card>

<Card title="Rate Limiting" icon="clock" href="/rate-limits">
  Understand rate limits, quotas, and best practices for high-volume API usage.
</Card>

<Card title="Error Handling" icon="triangle-exclamation" href="/errors">
  Handle errors gracefully with our comprehensive error codes and troubleshooting guide.
</Card>

<Card title="Webhooks" icon="webhook" href="/webhooks">
  Set up webhooks to receive real-time notifications about events in your account.
</Card>
</CardGroup>
```

---

### API Documentation Components

#### Parameter Fields

Use to document API request parameters with clear type information and descriptions.

**Parameter types:**
- `path` - URL path parameters
- `query` - Query string parameters
- `body` - Request body fields
- `header` - HTTP headers

```markdown
<ParamField path="user_id" type="string" required>
  Unique identifier for the user. Must be a valid UUID v4 format (e.g., `123e4567-e89b-12d3-a456-426614174000`).
</ParamField>

<ParamField body="email" type="string" required>
  User's email address. Must be valid and unique within the system. Maximum length: 255 characters.
</ParamField>

<ParamField query="limit" type="integer" default="10">
  Maximum number of results to return per page. Range: 1-100. Use with `offset` for pagination.
</ParamField>

<ParamField query="offset" type="integer" default="0">
  Number of results to skip. Use with `limit` for pagination through large result sets.
</ParamField>

<ParamField header="Authorization" type="string" required>
  Bearer token for API authentication. Format: `Bearer YOUR_API_KEY`
  
  Obtain your API key from the [dashboard settings](https://dashboard.example.com/settings/api).
</ParamField>

<ParamField header="Content-Type" type="string" default="application/json">
  Media type of the request body. Supported values: `application/json`, `application/x-www-form-urlencoded`
</ParamField>
```

#### Response Fields

Use to document API response structure and field meanings.

```markdown
<ResponseField name="id" type="string" required>
  Unique identifier assigned to the newly created resource. This ID is permanent and used for all subsequent operations.
</ResponseField>

<ResponseField name="created_at" type="timestamp" required>
  ISO 8601 formatted timestamp indicating when the resource was created (e.g., `2024-01-15T10:30:00Z`).
</ResponseField>

<ResponseField name="updated_at" type="timestamp">
  ISO 8601 formatted timestamp of the last update. Initially equals `created_at`, then updates with each modification.
</ResponseField>

<ResponseField name="status" type="enum">
  Current status of the resource. Possible values:
  - `active` - Resource is operational
  - `pending` - Resource is being processed
  - `suspended` - Temporarily disabled
  - `deleted` - Soft deleted (recoverable)
</ResponseField>

<ResponseField name="metadata" type="object">
  Custom key-value pairs for storing additional information. Maximum 50 keys, each key up to 40 characters.
</ResponseField>
```

#### Expandable - Nested Fields

Use for nested object properties or hierarchical information structures.

```markdown
<ResponseField name="user" type="object" required>
  Complete user object containing all associated account data.

  <Expandable title="User object properties">
    <ResponseField name="id" type="string">
      Unique user identifier (UUID v4 format).
    </ResponseField>
    
    <ResponseField name="profile" type="object">
      User profile information including personal details and preferences.
      
      <Expandable title="Profile details">
        <ResponseField name="first_name" type="string">
          User's first name as entered during registration. Maximum 50 characters.
        </ResponseField>
        
        <ResponseField name="last_name" type="string">
          User's last name. Maximum 50 characters.
        </ResponseField>
        
        <ResponseField name="avatar_url" type="string | null">
          URL to user's profile picture. Returns `null` if no avatar is set. Supported formats: JPG, PNG, WebP.
        </ResponseField>
        
        <ResponseField name="bio" type="string | null">
          User's biographical information. Maximum 500 characters. Returns `null` if not provided.
        </ResponseField>
      </Expandable>
    </ResponseField>
    
    <ResponseField name="permissions" type="array">
      Array of permission strings assigned to this user. Used for role-based access control.
      
      Example values: `["read:users", "write:posts", "admin:settings"]`
    </ResponseField>
    
    <ResponseField name="preferences" type="object">
      User-specific application settings and preferences.
      
      <Expandable title="Preference options">
        <ResponseField name="theme" type="string" default="light">
          UI theme preference. Options: `light`, `dark`, `auto`
        </ResponseField>
        
        <ResponseField name="notifications" type="object">
          Notification delivery preferences.
          
          <ResponseField name="email" type="boolean" default="true">
            Enable email notifications.
          </ResponseField>
          
          <ResponseField name="push" type="boolean" default="false">
            Enable push notifications.
          </ResponseField>
        </ResponseField>
      </Expandable>
    </ResponseField>
  </Expandable>
</ResponseField>
```

---

### Media Components

#### Frames - Images

Always wrap images in frames for consistent styling and optional captions.

**Best practices:**
- Use descriptive alt text for accessibility
- Optimize images for web (compress, use appropriate format)
- Include captions to explain what users should observe

```markdown
<Frame>
  <img src="/images/dashboard-overview.png" alt="Main dashboard showing analytics overview with revenue chart, user metrics, and recent activity feed" />
</Frame>

<Frame caption="The analytics dashboard provides real-time insights into your application performance and user engagement metrics">
  <img src="/images/analytics-detail.png" alt="Detailed analytics view with line charts for daily active users and conversion rates" />
</Frame>
```

#### Videos

Use HTML5 video element for self-hosted content or iframe for embedded videos.

**Self-hosted video:**
```markdown
<video
  controls
  className="w-full aspect-video rounded-xl"
  src="https://cdn.example.com/tutorials/getting-started.mp4"
  poster="/images/video-thumbnail.jpg"
>
  Your browser does not support the video tag.
</video>
```

**YouTube embed:**
```markdown
<iframe
  className="w-full aspect-video rounded-xl"
  src="https://www.youtube.com/embed/4KzFe50RQkQ"
  title="Getting Started with the API - Complete Tutorial"
  frameBorder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowFullScreen
></iframe>
```

#### Tooltips

Use tooltips to define technical terms inline without interrupting reading flow.

**When to use:**
- Technical jargon or acronyms
- Inline definitions
- Brief contextual explanations

```markdown
Use the <Tooltip tip="Application Programming Interface - a set of protocols and tools for building software applications">API</Tooltip> to integrate our services into your application.

Configure the <Tooltip tip="Time To Live - duration in seconds that a DNS record is cached">TTL</Tooltip> value based on your update frequency requirements.
```

#### Updates - Changelogs

Use for version release notes, changelogs, and product updates.

```markdown
<Update label="Version 2.1.0" description="Released March 15, 2024">
  ## New Features
  - **Bulk user import**: Import up to 10,000 users at once via CSV upload
  - **Advanced filtering**: New query parameters for complex search operations
  - **Webhook signatures**: Verify webhook authenticity with HMAC signatures
  
  ## Improvements
  - Reduced API response time by 40% through query optimization
  - Enhanced error messages with actionable suggestions and links to documentation
  - Updated rate limits: increased from 1,000 to 5,000 requests per hour
  
  ## Bug Fixes
  - Fixed pagination issue causing duplicate results with large datasets
  - Resolved authentication timeout when using refresh tokens
  - Corrected timezone handling in timestamp fields
  
  ## Breaking Changes
  <Warning>
  The `user.metadata` field now returns an object instead of a string. Update your code to parse this field correctly.
  </Warning>
</Update>
```

---

## Content Quality Standards

### Required Page Structure

Every documentation page must begin with YAML frontmatter containing title and description.

**Best practices:**
- Keep titles under 60 characters for SEO
- Write descriptions that clearly explain the page's value
- Use keywords naturally in both fields

```yaml
---
title: "Authentication Guide: API Keys and OAuth"
description: "Learn how to authenticate API requests using API keys, OAuth 2.0, or JWT tokens with step-by-step examples and best practices."
---
```

### Code Example Requirements

High-quality code examples are essential for technical documentation. Follow these standards:

**Completeness**
- ✅ Include all necessary imports and dependencies
- ✅ Show complete, runnable examples that users can copy-paste
- ✅ Include error handling and edge case management
- ❌ Don't use incomplete fragments or pseudocode without context

**Realism**
- ✅ Use realistic variable names, data, and scenarios
- ✅ Show expected outputs and results
- ✅ Include common variations and use cases
- ❌ Don't use placeholder values like "xxx" or "insert_here"

**Security**
- ✅ Use environment variables for sensitive data
- ✅ Include warnings about credential management
- ✅ Show secure coding practices
- ❌ Never include real API keys, passwords, or secrets

**Clarity**
- ✅ Add explanatory comments for complex logic
- ✅ Specify language and include filenames
- ✅ Format code consistently
- ❌ Don't leave code unexplained

**Example of high-quality code documentation:**

```markdown
Create a configuration file to initialize the SDK with your credentials:

```javascript config.js
import { Client } from '@example/sdk';

// Load credentials from environment variables (never hardcode)
const client = new Client({
  apiKey: process.env.API_KEY,
  apiSecret: process.env.API_SECRET,
  
  // Optional: Configure retry logic
  retryConfig: {
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelay: 1000 // milliseconds
  },
  
  // Optional: Enable request logging in development
  debug: process.env.NODE_ENV === 'development'
});

// Handle initialization errors
client.on('error', (error) => {
  console.error('SDK Error:', error.message);
  // Implement your error handling logic
});

export default client;
```

<Warning>
Store your API credentials in environment variables or a secure secrets manager. Never commit credentials to version control.
</Warning>

After creating the configuration, verify the connection:

```javascript
import client from './config.js';

async function testConnection() {
  try {
    const response = await client.ping();
    console.log('Connection successful:', response);
    // Expected output: { status: 'ok', latency: 45 }
  } catch (error) {
    console.error('Connection failed:', error.message);
  }
}

testConnection();
```
```

### API Documentation Standards

Complete API documentation requires thorough coverage of all aspects:

**Required Elements**
- ✅ All parameters (required and optional) with clear descriptions
- ✅ Parameter types, defaults, and validation rules
- ✅ Both success and error response examples
- ✅ All possible HTTP status codes
- ✅ Rate limiting information
- ✅ Authentication requirements
- ✅ Request/response example pairs

**Example of complete endpoint documentation:**

```markdown
## Create User

Creates a new user account with the provided information.

### Endpoint

```
POST /v1/users
```

### Headers

<ParamField header="Authorization" type="string" required>
  Bearer token for API authentication. Format: `Bearer YOUR_API_KEY`
</ParamField>

<ParamField header="Content-Type" type="string" required>
  Must be `application/json`
</ParamField>

### Request Body

<ParamField body="email" type="string" required>
  User's email address. Must be valid and unique. Maximum 255 characters.
</ParamField>

<ParamField body="name" type="string" required>
  User's full name. Minimum 2 characters, maximum 100 characters.
</ParamField>

<ParamField body="role" type="string" default="user">
  User role for permissions. Options: `admin`, `user`, `viewer`
</ParamField>

<ParamField body="metadata" type="object">
  Optional custom data. Maximum 50 key-value pairs, each key up to 40 characters.
</ParamField>

### Responses

<ResponseField name="id" type="string">
  Unique identifier for the created user (UUID v4 format).
</ResponseField>

<ResponseField name="email" type="string">
  User's email address as provided in the request.
</ResponseField>

<ResponseField name="name" type="string">
  User's full name as provided in the request.
</ResponseField>

<ResponseField name="role" type="string">
  Assigned user role.
</ResponseField>

<ResponseField name="created_at" type="timestamp">
  ISO 8601 timestamp of when the user was created.
</ResponseField>

<ResponseField name="status" type="string">
  Account status. Always `active` for newly created users.
</ResponseField>

### Example Request

<RequestExample>
```bash cURL
curl -X POST 'https://api.example.com/v1/users' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "john.doe@example.com",
    "name": "John Doe",
    "role": "user",
    "metadata": {
      "company": "Acme Corp",
      "department": "Engineering"
    }
  }'
```

```javascript Node.js
const response = await fetch('https://api.example.com/v1/users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'john.doe@example.com',
    name: 'John Doe',
    role: 'user',
    metadata: {
      company: 'Acme Corp',
      department: 'Engineering'
    }
  })
});

const data = await response.json();
console.log('Created user:', data);
```
</RequestExample>

### Example Responses

<ResponseExample>
```json 201 Created
{
  "id": "usr_abc123xyz",
  "email": "john.doe@example.com",
  "name": "John Doe",
  "role": "user",
  "status": "active",
  "created_at": "2024-01-15T10:30:00Z",
  "metadata": {
    "company": "Acme Corp",
    "department": "Engineering"
  }
}
```

```json 400 Bad Request
{
  "error": {
    "code": "INVALID_EMAIL",
    "message": "The email address provided is already in use",
    "field": "email",
    "details": "An account with this email already exists. Try logging in or use password recovery."
  }
}
```

```json 401 Unauthorized
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "The provided API key is invalid or expired",
    "details": "Obtain a valid API key from your dashboard settings."
  }
}
```

```json 429 Too Many Requests
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "retry_after": 60,
    "details": "You can make 1000 requests per hour. Retry after 60 seconds."
  }
}
```
</ResponseExample>

### Rate Limits

- **Standard**: 1,000 requests per hour
- **Enterprise**: 10,000 requests per hour

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests per hour
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when the limit resets

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_EMAIL` | Email address is invalid or already in use |
| `INVALID_ROLE` | The specified role is not valid |
| `VALIDATION_ERROR` | One or more required fields are missing or invalid |
| `INVALID_TOKEN` | API key is invalid or expired |
| `RATE_LIMIT_EXCEEDED` | Too many requests in the current time window |
```

### Accessibility Standards

Make documentation accessible to all users, including those using assistive technologies:

**Images and Media**
- ✅ Include descriptive alt text explaining what's shown
- ✅ Use captions to highlight key observations
- ✅ Ensure sufficient color contrast (4.5:1 minimum)
- ❌ Don't use "image of" or "picture of" in alt text

**Navigation**
- ✅ Use proper heading hierarchy (H2, H3, H4)
- ✅ Create descriptive link text
- ✅ Enable keyboard navigation
- ❌ Don't use "click here" or "read more"

**Content Structure**
- ✅ Use semantic HTML elements
- ✅ Provide text alternatives for visual information
- ✅ Structure content with headings and lists
- ❌ Don't rely solely on color to convey information

**Examples:**

```markdown
Good alt text:
<img alt="Dashboard showing three panels: revenue chart with upward trend, user growth metrics at 45% increase, and recent activity list with 12 new sign-ups" />

Bad alt text:
<img alt="Dashboard" />
<img alt="Picture of dashboard" />

Good link text:
Learn more in our [authentication guide](/docs/auth)

Bad link text:
Click [here](/docs/auth) to learn more
```

---

## Component Selection Guide

Choose the right component for your content type to ensure clarity and consistency.

### Decision Matrix

| Content Type | Recommended Component | Reason |
|-------------|----------------------|---------|
| Step-by-step procedures | `<Steps>` | Enforces sequential order, includes verification |
| Platform-specific instructions | `<Tabs>` | Separates OS/framework variations cleanly |
| Multi-language code samples | `<CodeGroup>` | Shows same concept across languages |
| API endpoint docs | `<RequestExample>` + `<ResponseExample>` | Complete request-response cycle |
| API parameters | `<ParamField>` | Structured parameter documentation |
| API responses | `<ResponseField>` | Structured response field documentation |
| Supplementary info | `<Accordion>` | Progressive disclosure, reduces clutter |
| Important warnings | `<Warning>` | Draws attention to critical information |
| Best practices | `<Tip>` | Highlights expert advice |
| Navigation/features | `<Card>` or `<CardGroup>` | Visual, scannable layout |
| Nested objects | `<Expandable>` | Hierarchical structure |
| Inline definitions | `<Tooltip>` | Non-intrusive explanations |

### Common Scenarios

**Scenario: Multi-step installation process**
```markdown
Use: <Steps>
Why: Sequential order is critical, users need verification at each step
```

**Scenario: Showing how to call an API in different languages**
```markdown
Use: <CodeGroup>
Why: Same concept, different syntax for different languages
```

**Scenario: Documenting a REST API endpoint**
```markdown
Use: <RequestExample> + <ResponseExample> + <ParamField> + <ResponseField>
Why: Complete API documentation requires all these elements
```

**Scenario: Troubleshooting common issues**
```markdown
Use: <AccordionGroup> with individual <Accordion> items
Why: Keeps page clean, users can expand only relevant issues
```

**Scenario: Warning about a breaking change**
```markdown
Use: <Warning>
Why: Critical information that could break user implementations
```

**Scenario: Homepage navigation to different guides**
```markdown
Use: <CardGroup> with multiple <Card> items
Why: Visual, scannable, and easy to navigate
```

---

## Quick Reference

### Component Cheat Sheet

```markdown
# Callouts
<Note>Additional context</Note>
<Tip>Best practice or shortcut</Tip>
<Warning>Critical caution</Warning>
<Info>Neutral information</Info>
<Check>Success confirmation</Check>

# Code
```language filename
code here
```

<CodeGroup>
```language Tab Name
```
</CodeGroup>

<RequestExample>
```bash cURL
```
</RequestExample>

<ResponseExample>
```json Success
```
</ResponseExample>

# Structure
<Steps>
<Step title="Title">
Content
</Step>
</Steps>

<Tabs>
<Tab title="Title">
Content
</Tab>
</Tabs>

<AccordionGroup>
<Accordion title="Title">
Content
</Accordion>
</AccordionGroup>

# Cards
<Card title="Title" icon="icon" href="/path">
Description
</Card>

<CardGroup cols={2}>
<Card title="Title" icon="icon" href="/path">
Description
</Card>
</CardGroup>

# API Documentation
<ParamField path="name" type="string" required>
Description
</ParamField>

<ResponseField name="name" type="string">
Description
</ResponseField>

<Expandable title="Title">
<ResponseField name="nested" type="string">
Description
</ResponseField>
</Expandable>

# Media
<Frame caption="Optional caption">
<img src="/path" alt="Description" />
</Frame>

<Tooltip tip="Explanation">term</Tooltip>

# Updates
<Update label="Version" description="Date">
Content
</Update>
```

### Writing Checklist

Before publishing any documentation:

**Structure**
- [ ] YAML frontmatter with title and description
- [ ] Logical heading hierarchy (H2 → H3 → H4)
- [ ] Clear introduction explaining page purpose
- [ ] Logical flow from basic to advanced

**Content**
- [ ] Second person ("you") for instructions
- [ ] Active voice throughout
- [ ] Present tense for current states
- [ ] Consistent terminology
- [ ] No jargon without definitions

**Code Examples**
- [ ] Complete and runnable
- [ ] Includes error handling
- [ ] Uses realistic data
- [ ] No hardcoded credentials
- [ ] Tested and verified
- [ ] Proper syntax highlighting

**API Documentation**
- [ ] All parameters documented
- [ ] Success and error examples
- [ ] Rate limiting information
- [ ] Authentication details
- [ ] All HTTP status codes covered

**Accessibility**
- [ ] Descriptive alt text for images
- [ ] Meaningful link text
- [ ] Proper heading hierarchy
- [ ] Keyboard navigation support

**User Experience**
- [ ] Prerequisites listed upfront
- [ ] Expected outcomes provided
- [ ] Troubleshooting for common issues
- [ ] Verification steps included
- [ ] Related resources linked

---

## Additional Resources

- [Mintlify Documentation](https://mintlify.com/docs)
- [Mintlify Components Gallery](https://mintlify.com/docs/components)
- [docs.json Schema Reference](https://mintlify.com/docs.json)
- [MDX Documentation](https://mdxjs.com/)

---

**Last Updated:** January 2025  
**Guide Version:** 2.0
