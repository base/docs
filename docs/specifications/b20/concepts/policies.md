# Policies

*How B20 reuses shared allowlists and blocklists for compliance checks. Roles and pause are a separate authorization layer; see [Roles and Pause](roles-and-pause.md). The Policy Registry precompile itself is in [Architecture](../architecture.md).*

## 1. Why policies exist

Most token compliance reduces to a membership check on an address list: is this account allowed to send, receive, or be minted to? Issuers repeat those lists across many tokens. Copying the same KYC allowlist or sanctions blocklist onto every token creates drift. One list update has to land in every copy.

Policies move the list into one place. The Policy Registry is a singleton precompile. It stores each list once, with the membership logic that runs on it. A token stores only a policy ID in a slot. Before a gated function runs, the token asks the registry whether the relevant address is authorized. Many tokens can share one policy. An update to that policy is visible to every token that references it.

```mermaid
flowchart LR
    T1[Token A] -->|policy ID| R[Policy Registry]
    T2[Token B] -->|same policy ID| R
    R --> L[One member set]
```



A role answers who may call a privileged function. Pause answers whether that class of operation is live. A policy answers whether a specific address is authorized for that operation. All three can apply to the same call.

## 2. How policies work

### 2.1 The registry and the token

The Policy Registry owns member sets and composite gates. Creation is permissionless. Each policy has an admin who updates membership, replaces a composite's children, or transfers administration. Tokens never write those lists. They store a `uint64` policy ID per [scope](#32-policy-scopes) and call `isAuthorized(policyId, account)` when that scope runs.

`isAuthorized` never reverts. It returns whether the account is authorized under that policy. The token decides what a `false` (or, for one scope, a `true`) means. Most scopes revert `PolicyForbids` when the result is `false`. The function then does not run.

```mermaid
flowchart TD
    A[Gated call arrives at the token] --> B[Read policy ID from the scope]
    B --> C["Registry isAuthorized(policyId, account)"]
    C -->|scope allows| D[Function continues]
    C -->|scope denies| E[Revert]
```



### 2.2 Policy types

A policy is either simple or composite.

A **simple** policy decides from one address set:


| Type        | Authorized when               |
| ----------- | ----------------------------- |
| `ALLOWLIST` | The account is in the set     |
| `BLOCKLIST` | The account is not in the set |


An empty allowlist authorizes nobody. An empty blocklist authorizes everybody.

A **composite** policy combines two to four existing simple policies. It does not copy their members. Each `isAuthorized` call reads each child's current set:


| Type        | Authorized when                    |
| ----------- | ---------------------------------- |
| `UNION`     | Any child authorizes the account   |
| `INTERSECT` | Every child authorizes the account |


Children must be existing `ALLOWLIST` or `BLOCKLIST` policies. Another composite is not a valid child. The built-in sentinels in [§2.4](#24-built-in-sentinels) are not valid children either. Updating a child's members changes every composite that references it. There is no flatten-and-copy step.

```mermaid
flowchart TD
    Q["isAuthorized(policyId, account)"] --> T{Policy type}
    T -->|ALLOWLIST| A[In the set?]
    T -->|BLOCKLIST| B[Not in the set?]
    T -->|UNION| U[Any child authorizes?]
    T -->|INTERSECT| I[Every child authorizes?]
    A --> R[true or false]
    B --> R
    U --> R
    I --> R
```



### 2.3 Creating and updating

Anyone can create a policy. The create call names a single `admin`. That address is the only one that can later change membership, replace a composite's children, transfer administration, or renounce. The creator does not have to be the admin. `admin` cannot be `address(0)`.

You can also skip creation and reuse an existing policy. If another issuer already maintains the list you need, bind their policy ID to your token. You do not become that policy's admin by attaching it.

#### 2.3.1 Creating a policy

A simple policy starts as an `ALLOWLIST` or a `BLOCKLIST`. Call `createPolicy(admin, ALLOWLIST)` or `createPolicy(admin, BLOCKLIST)`. The registry assigns a new policy ID and returns it. The member set is empty. `createPolicyWithAccounts(admin, policyType, accounts)` does the same and seeds the set in that call. Membership batches are capped at 64 accounts.

A composite starts from policies that already exist. Call `createCompositePolicy(admin, UNION | INTERSECT, childPolicyIds)`. The child count must be in `[MIN_COMPOSITE_CHILD_POLICIES, MAX_COMPOSITE_CHILD_POLICIES]` (`2` through `4`). The registry stores references, not a snapshot of the children's members.

Both paths emit `PolicyCreated` and `PolicyAdminUpdated(policyId, address(0), admin)`. `policyAdmin(policyId)` then returns that admin.

```mermaid
sequenceDiagram
    participant Creator
    participant Registry as Policy Registry

    Creator->>Registry: createPolicy(admin, ALLOWLIST)
    Registry-->>Creator: PolicyCreated + PolicyAdminUpdated
    Registry-->>Creator: policyId
```



#### 2.3.2 Updating a policy

After creation, only the current admin can change the policy. Any other caller reverts `Unauthorized`. The update must match the policy's type or it reverts `IncompatiblePolicyType`.

The admin of an allowlist calls `updateAllowlist(policyId, allowed, accounts)` to add or remove members. The admin of a blocklist calls `updateBlocklist(policyId, blocked, accounts)`. The admin of a composite calls `updateComposite(policyId, childPolicyIds)` to replace the child set in full. There is no partial child edit.

Those writes change what `isAuthorized` returns on the next query. Every token that already stores this policy ID sees the new result. The token does not need a second `updatePolicy`.

```mermaid
sequenceDiagram
    participant Admin
    participant Other as Other caller
    participant Registry as Policy Registry

    Other->>Registry: updateAllowlist(policyId, ...)
    Registry-->>Other: revert Unauthorized
    Admin->>Registry: updateAllowlist(policyId, true, [Alice])
    Registry-->>Admin: AllowlistUpdated
```



#### 2.3.3 Changing the admin

A policy has one admin at a time. To hand it off, the current admin calls `stageUpdateAdmin(policyId, newAdmin)`. That does not change who can update the policy yet. `policyAdmin` still returns the current admin. `pendingPolicyAdmin` returns `newAdmin`. Passing `address(0)` clears a nomination that has not been finalized.

The pending admin then calls `finalizeUpdateAdmin(policyId)`. The caller must be the staged address, or the call reverts `Unauthorized`. If nothing is staged, it reverts `NoPendingAdmin`. On success the pending admin becomes the current admin, the pending slot clears, and the previous admin can no longer update the policy.

```mermaid
sequenceDiagram
    participant Admin
    participant Next as nextAdmin
    participant Registry as Policy Registry

    Admin->>Registry: stageUpdateAdmin(policyId, nextAdmin)
    Registry-->>Admin: PolicyAdminStaged
    Admin->>Registry: updateAllowlist(policyId, ...)
    Registry-->>Admin: AllowlistUpdated
    Next->>Registry: finalizeUpdateAdmin(policyId)
    Registry-->>Next: PolicyAdminUpdated
    Admin->>Registry: updateAllowlist(policyId, ...)
    Registry-->>Admin: revert Unauthorized
    Next->>Registry: updateAllowlist(policyId, ...)
    Registry-->>Next: AllowlistUpdated
```



To freeze a policy instead of handing it off, the current admin calls `renounceAdmin(policyId)`. Administration is gone for good. Membership and child sets cannot change. `isAuthorized` keeps working. There is no call that assigns a new admin after renounce.

### 2.4 Built-in sentinels

Two policy IDs exist without being created:


| ID                   | `isAuthorized`            | Typical use                                             |
| -------------------- | ------------------------- | ------------------------------------------------------- |
| `ALWAYS_ALLOW` (`0`) | `true` for every account  | No compliance on that scope. This is the unset default. |
| `ALWAYS_BLOCK`       | `false` for every account | Deny every account on that scope.                       |




## 3. How policies attach to a token

A scope is an identifier for the policy that runs on a specific function. It works like a hook. When that function is called, the token reads the policy ID bound to the scope and asks the registry `isAuthorized` about the address the scope checks. The registry still holds the list. The token stores only the ID.

### 3.1 Updating a scope

`updatePolicy(policyScope, newPolicyId)` binds a policy ID to a scope. It requires `DEFAULT_ADMIN_ROLE`. The ID must be a built-in sentinel or an existing registry policy. Otherwise the call reverts `PolicyNotFound`. An unknown `policyScope` reverts `UnsupportedPolicyType`.

The write takes effect on the next call that hits that scope. It emits `PolicyUpdated`. Until you update a scope, it reads as `0` (`ALWAYS_ALLOW`), so the check passes for every address. The same policy ID can sit on more than one scope and on more than one token. `policyId(policyScope)` reads the current binding.

You can also bind a policy in `createB20` `initCalls`, in the same transaction that creates the token.

```mermaid
sequenceDiagram
    participant Admin
    participant Registry as Policy Registry
    participant Token as B20 token

    Admin->>Registry: createPolicy(admin, ALLOWLIST)
    Registry-->>Admin: policyId
    Admin->>Token: updatePolicy(TRANSFER_RECEIVER_POLICY, policyId)
    Token-->>Admin: PolicyUpdated
```

### 3.2 Policy scopes

Most scopes deny when `isAuthorized` is `false` and revert `PolicyForbids`. `SEIZE_HOLDER_POLICY` denies when `isAuthorized` is `true` and reverts `AccountNotSeizable`.

| Scope                      | Runs on                                                                                         | Account checked                     | Denies when `isAuthorized` is | Error                |
| -------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------- | -------------------- |
| `TRANSFER_SENDER_POLICY`   | `transfer`, `transferFrom`, and memo'd variants. Skipped on factory `initCalls` transfers.      | `from` (`msg.sender` on `transfer`) | `false`                       | `PolicyForbids`      |
| `TRANSFER_RECEIVER_POLICY` | `transfer`, `transferFrom`, and memo'd variants. Skipped on factory `initCalls` transfers.      | `to`                                | `false`                       | `PolicyForbids`      |
| `TRANSFER_EXECUTOR_POLICY` | `transferFrom` and `transferFromWithMemo` when `msg.sender != from`. Not on `transfer`. Skipped on factory `initCalls`. | `msg.sender`                        | `false`                       | `PolicyForbids`      |
| `MINT_RECEIVER_POLICY`     | `mint`, `mintWithMemo`, and Asset `batchMint`. Always checked, including factory `initCalls` mints. | `to`                                | `false`                       | `PolicyForbids`      |
| `SEIZE_HOLDER_POLICY`      | `seizeWithMemo`. Unset (`ALWAYS_ALLOW`) means no account is seizable.                            | `from`                              | `true`                        | `AccountNotSeizable` |
| `SEIZE_RECEIVER_POLICY`    | `seizeWithMemo`. Unset (`ALWAYS_ALLOW`) means seize may send to any destination.                 | `to`                                | `false`                       | `PolicyForbids`      |

## 4. Example

Start with a receiver allowlist. Then combine it with a sanctions blocklist so a transfer requires both.

### 4.1 One allowlist

Create an allowlist, add the KYC'd accounts, and bind it to `TRANSFER_RECEIVER_POLICY`. Alice is on the list. Bob is not. A holder can send to Alice. A send to Bob reverts.

```mermaid
sequenceDiagram
    participant Admin
    participant Registry as Policy Registry
    participant Token as B20 token
    participant Holder
    participant Alice
    participant Bob

    Admin->>Registry: createPolicy(admin, ALLOWLIST)
    Registry-->>Admin: kycId
    Admin->>Registry: updateAllowlist(kycId, true, [Alice])
    Admin->>Token: updatePolicy(TRANSFER_RECEIVER_POLICY, kycId)

    Holder->>Token: transfer(Alice, amount)
    Token->>Registry: isAuthorized(kycId, Alice)
    Registry-->>Token: true
    Token-->>Holder: allowed

    Holder->>Token: transfer(Bob, amount)
    Token->>Registry: isAuthorized(kycId, Bob)
    Registry-->>Token: false
    Token-->>Holder: revert PolicyForbids(TRANSFER_RECEIVER_POLICY, kycId)
```



Adding Bob to the allowlist later authorizes him on every token that already points at `kycId`. There is no second write on the token.

### 4.2 Composite: KYC and sanctions

A single allowlist cannot express "on the KYC list and not on the sanctions list" when those lists are maintained separately. Create both simple policies, then an `INTERSECT` composite, then bind the composite to the transfer and mint scopes.

```mermaid
flowchart TD
    C["INTERSECT composite"] --> K[KYC ALLOWLIST]
    C --> S[Sanctions BLOCKLIST]
    K --> A1[Alice: member]
    K --> A2[Bob: not a member]
    K --> A3[Carol: member]
    S --> B1[Alice: not listed]
    S --> B2[Bob: not listed]
    S --> B3[Carol: listed]
```



```mermaid
sequenceDiagram
    participant Admin
    participant Registry as Policy Registry
    participant Token as B20 token
    participant Alice
    participant Dave
    participant Carol

    Admin->>Registry: createPolicy(admin, ALLOWLIST)
    Registry-->>Admin: kycId
    Admin->>Registry: updateAllowlist(kycId, true, [Alice, Dave, Carol])
    Admin->>Registry: createPolicy(admin, BLOCKLIST)
    Registry-->>Admin: sanctionsId
    Admin->>Registry: updateBlocklist(sanctionsId, true, [Carol])
    Admin->>Registry: createCompositePolicy(admin, INTERSECT, [kycId, sanctionsId])
    Registry-->>Admin: gateId
    Admin->>Token: updatePolicy(TRANSFER_SENDER_POLICY, gateId)
    Admin->>Token: updatePolicy(TRANSFER_RECEIVER_POLICY, gateId)
    Admin->>Token: updatePolicy(MINT_RECEIVER_POLICY, gateId)

    Alice->>Token: transfer(Dave, amount)
    Token->>Registry: isAuthorized(gateId, Alice)
    Registry-->>Token: true
    Token->>Registry: isAuthorized(gateId, Dave)
    Registry-->>Token: true
    Token-->>Alice: allowed

    Alice->>Token: transfer(Carol, amount)
    Token->>Registry: isAuthorized(gateId, Carol)
    Registry-->>Token: false
    Token-->>Alice: revert PolicyForbids(TRANSFER_RECEIVER_POLICY, gateId)
```



Alice and Dave are on the KYC list and not on the sanctions list, so both children authorize them and the `INTERSECT` returns `true`. Carol is KYC'd but sanctioned: the blocklist returns `false`, so the composite returns `false` and the transfer reverts. Bob is not on the KYC list, so he is denied even though he is not sanctioned.

A later `updateBlocklist` that adds or removes Carol changes the composite on the next call. The token still holds `gateId`. The issuer does not call `updatePolicy` again.

If the issuer later needs the same KYC list or-ed with a token-specific partner allowlist, they create a `UNION` of those two allowlists instead. The token bind step is the same.

## Events and Errors

### Token


| Event                                                  | Emitted by                                               |
| ------------------------------------------------------ | -------------------------------------------------------- |
| `PolicyUpdated(policyScope, oldPolicyId, newPolicyId)` | `updatePolicy`; also token creation (`oldPolicyId == 0`) |



| Error                                  | Thrown when                                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| `PolicyForbids(policyScope, policyId)` | A deny-on-false scope rejected the account                                               |
| `PolicyNotFound(policyId)`             | `updatePolicy` was given an ID that is not a sentinel and does not exist in the registry |
| `UnsupportedPolicyType(policyScope)`   | `policyScope` is not a slot this token supports                                          |
| `AccountNotSeizable(account)`          | `seizeWithMemo` `from` is still authorized under `SEIZE_HOLDER_POLICY`                   |
| `AccountNotBlocked(account)`           | Deprecated `burnBlocked` `from` is still authorized under `TRANSFER_SENDER_POLICY`       |


### Policy Registry


| Event                                                       | Emitted by                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------- |
| `PolicyCreated(policyId, creator, policyType)`              | `createPolicy`, `createPolicyWithAccounts`, `createCompositePolicy` |
| `PolicyAdminStaged(policyId, currentAdmin, pendingAdmin)`   | `stageUpdateAdmin`                                                  |
| `PolicyAdminUpdated(policyId, previousAdmin, newAdmin)`     | `finalizeUpdateAdmin`, `renounceAdmin`; also policy creation        |
| `AllowlistUpdated(policyId, updater, allowed, accounts)`    | `updateAllowlist`                                                   |
| `BlocklistUpdated(policyId, updater, blocked, accounts)`    | `updateBlocklist`                                                   |
| `CompositePolicyUpdated(policyId, updater, childPolicyIds)` | `createCompositePolicy`, `updateComposite`                          |



| Error                               | Thrown when                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| `Unauthorized()`                    | Caller is not the policy admin (or not the pending admin on `finalizeUpdateAdmin`) |
| `PolicyNotFound()`                  | The referenced policy ID does not exist                                            |
| `IncompatiblePolicyType()`          | The call does not match the policy's type                                          |
| `ZeroAddress()`                     | A required address argument was `address(0)`                                       |
| `BatchSizeTooLarge(maxBatchSize)`   | A membership batch exceeded 64 accounts                                            |
| `NoPendingAdmin()`                  | `finalizeUpdateAdmin` was called with no staged admin                              |
| `ChildPoliciesOutsideOfRange()`     | A composite's child count is outside `[2, 4]`                                      |
| `InvalidChildPolicy(childPolicyId)` | A composite child is not an existing simple policy                                 |
| `NonPayable()`                      | ETH was attached to a registry call                                                |


