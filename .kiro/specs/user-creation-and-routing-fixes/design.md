# Design Document

## Overview

Este documento descreve o design técnico para resolver dois problemas críticos: erros na criação de usuários administrativos e a necessidade de acesso direto ao dashboard sem passar pela rota /app. A solução envolve correções no banco de dados, atualização das funções SQL e modificação do sistema de roteamento.

## Architecture

### Current State Analysis

**Problema 1 - Criação de Usuários:**
- A função `create_admin_user_v2` foi implementada mas ainda apresenta erros
- Constraints de foreign key estão causando falhas na criação
- Vinculação entre registros administrativos e usuários reais não está funcionando corretamente

**Problema 2 - Roteamento:**
- Aplicação configurada com `basename="/app"` no BrowserRouter
- Usuários precisam acessar `/app` para chegar ao dashboard
- Experiência de usuário não é ideal

### Proposed Solution Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
├─────────────────────────────────────────────────────────────┤
│  Router Configuration (Remove /app basename)                │
│  ├── / (Root) → Dashboard (if authenticated)               │
│  ├── /auth → Login/Register                                │
│  ├── /admin → Admin Panel                                  │
│  └── /settings → User Settings                             │
├─────────────────────────────────────────────────────────────┤
│                   Backend Layer                             │
├─────────────────────────────────────────────────────────────┤
│  Database Functions (Fixed)                                │
│  ├── create_admin_user_v3 (Improved version)              │
│  ├── link_admin_record_to_user (Fixed trigger)            │
│  └── get_admin_users_v2 (Working correctly)               │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Database Schema Updates

**Profiles Table Modifications:**
```sql
-- Ensure proper structure for admin-created users
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS is_admin_created BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_email TEXT,
  ADD COLUMN IF NOT EXISTS temp_id UUID DEFAULT gen_random_uuid();
```

**Key Changes:**
- `temp_id`: Temporary identifier for admin-created records
- `is_admin_created`: Flag to identify administrative records
- `admin_email`: Email for pre-registration records

### 2. Improved SQL Functions

**create_admin_user_v3:**
```sql
-- Enhanced function with better error handling and constraint management
CREATE OR REPLACE FUNCTION create_admin_user_v3(
  user_email TEXT,
  user_full_name TEXT,
  user_role TEXT DEFAULT 'user',
  plan_type TEXT DEFAULT 'free'
)
RETURNS JSON
```

**Key Improvements:**
- Better UUID management
- Proper constraint handling
- Enhanced error reporting
- Atomic transactions

### 3. Frontend Routing System

**App.tsx Modifications:**
```typescript
// Remove basename="/app" from BrowserRouter
<BrowserRouter>
  <AuthProvider>
    <Routes>
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </AuthProvider>
</BrowserRouter>
```

**ProtectedRoute Component:**
- Enhanced to handle root path redirects
- Improved authentication state management
- Better error handling for unauthenticated users

## Data Models

### Enhanced Profile Model
```typescript
interface Profile {
  id: string;
  user_id?: string; // Optional for admin-created records
  full_name: string;
  admin_email?: string; // For pre-registration records
  is_admin_created: boolean;
  temp_id?: string; // Temporary identifier
  created_at: string;
  updated_at: string;
}
```

### Admin User Creation Response
```typescript
interface AdminUserCreationResponse {
  success: boolean;
  record_id?: string;
  temp_id?: string;
  email: string;
  full_name: string;
  role: string;
  plan_type: string;
  message: string;
  error?: string;
}
```

## Error Handling

### Database Level
1. **Constraint Violations:** Proper handling of foreign key constraints
2. **Duplicate Records:** Check for existing emails before creation
3. **Transaction Rollback:** Ensure data consistency on failures

### Application Level
1. **User Feedback:** Clear error messages for admin users
2. **Logging:** Comprehensive error logging for debugging
3. **Retry Logic:** Automatic retry for transient failures

### Frontend Level
1. **Route Guards:** Proper authentication checks
2. **Fallback Routes:** Handle invalid URLs gracefully
3. **Loading States:** Show appropriate loading indicators

## Testing Strategy

### Database Testing
```sql
-- Test admin user creation
SELECT create_admin_user_v3('test@example.com', 'Test User', 'user', 'premium');

-- Test user registration linking
-- (Simulate user registration with existing admin email)

-- Test data consistency
SELECT * FROM profiles WHERE is_admin_created = TRUE;
SELECT * FROM subscriptions WHERE status = 'pending';
```

### Frontend Testing
```typescript
// Test routing behavior
describe('Routing', () => {
  test('Root path redirects to dashboard when authenticated', () => {
    // Test implementation
  });
  
  test('Root path shows login when not authenticated', () => {
    // Test implementation
  });
  
  test('Admin creation works without errors', () => {
    // Test implementation
  });
});
```

### Integration Testing
1. **End-to-End User Creation Flow**
2. **Authentication and Routing Integration**
3. **Database Function Integration**

## Performance Considerations

### Database Optimizations
- Proper indexing on `admin_email` and `is_admin_created` columns
- Efficient queries in RPC functions
- Minimal database round trips

### Frontend Optimizations
- Lazy loading of admin components
- Efficient state management
- Minimal re-renders on route changes

## Security Considerations

### Database Security
- Proper RLS (Row Level Security) policies
- Function execution permissions
- Input validation and sanitization

### Frontend Security
- Protected routes implementation
- Proper authentication state management
- CSRF protection maintenance

## Migration Strategy

### Phase 1: Database Fixes
1. Apply new SQL migrations
2. Test database functions
3. Verify data integrity

### Phase 2: Frontend Updates
1. Update routing configuration
2. Test navigation flows
3. Update any hardcoded /app references

### Phase 3: Validation
1. End-to-end testing
2. User acceptance testing
3. Performance validation

## Rollback Plan

### Database Rollback
```sql
-- Rollback script to revert changes if needed
-- (Specific rollback commands will be provided)
```

### Frontend Rollback
- Revert routing changes
- Restore original basename configuration
- Update any affected components