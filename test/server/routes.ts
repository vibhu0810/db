import { Express, Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { setupAuth } from './auth';
import passport from 'passport';
import { 
  InsertUser, UpdateProfile, User, loginSchema, updatePasswordSchema, updateUsernameSchema,
  insertOrganizationSchema, Organization, InsertOrganization,
  insertUserAssignmentSchema, UserAssignment,
  insertDomainSchema, Domain,
  insertDomainPricingSchema, DomainPricing,
  insertPricingTierSchema, PricingTier,
  insertOrderSchema, Order,
  insertOrderCommentSchema, OrderComment,
  insertTicketSchema, updateTicketSchema, SupportTicket,
  insertTicketCommentSchema, TicketComment,
  insertFeedbackQuestionSchema, FeedbackQuestion,
  insertFeedbackCampaignSchema, FeedbackCampaign,
  insertFeedbackSchema, Feedback,
  insertOrderFeedbackSchema, OrderFeedback,
  insertNotificationSchema, Notification,
  insertInvoiceSchema, Invoice,
  insertUserPricingTierSchema
} from '../shared/schema';
import { z } from 'zod';
import { Server } from 'http';

// Helper to update user activity timestamp
function updateUserActivity(userId: number) {
  storage.updateUser(userId, { updated_at: new Date() }).catch(console.error);
}

// Register all API routes
export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication middleware
  const { isAuthenticated, hasRole, isAdmin, isManager, isOrganizationAdmin } = setupAuth(app);

  // ==================== Auth Routes ====================
  
  app.post('/api/test/auth/login', passport.authenticate('local'), (req, res) => {
    // Update last activity
    if (req.user) {
      updateUserActivity(req.user.id);
    }
    res.json(req.user);
  });

  app.post('/api/test/auth/logout', (req, res) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });

  app.get('/api/test/user', (req, res) => {
    if (req.isAuthenticated()) {
      // Update last activity
      updateUserActivity(req.user.id);
      res.json(req.user);
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });

  app.post('/api/test/auth/register', async (req, res) => {
    try {
      // Validate request body against schema
      const validatedData = insertOrganizationSchema.parse(req.body.organization);
      const userData = insertUserSchema.parse(req.body.user);
      
      // Create organization
      const organization = await storage.createOrganization(validatedData);
      
      // Create admin user for the organization
      const user = await storage.createUser({
        ...userData,
        organization_id: organization.id,
        is_admin: true,
        role: 'admin'
      });
      
      // Log in the newly created user
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Error logging in', error: err.message });
        }
        return res.json(user);
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/auth/verify-email', isAuthenticated, async (req, res) => {
    try {
      const token = req.body.token;
      
      if (!token) {
        return res.status(400).json({ message: 'Token is required' });
      }
      
      if (req.user.verificationToken !== token) {
        return res.status(400).json({ message: 'Invalid token' });
      }
      
      // Update user's email verification status
      const user = await storage.updateUser(req.user.id, {
        emailVerified: true,
        verificationToken: null
      });
      
      res.json({ success: true, user });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/auth/reset-password-request', async (req, res) => {
    try {
      const email = req.body.email;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Don't reveal that the email doesn't exist
        return res.json({ success: true, message: 'If a user with that email exists, a password reset link has been sent.' });
      }
      
      // Generate a reset token
      const token = require('crypto').randomBytes(32).toString('hex');
      
      // Set expiration to 1 hour from now
      const expires = new Date();
      expires.setHours(expires.getHours() + 1);
      
      // Save token to user
      await storage.updateUser(user.id, {
        password_reset_token: token,
        password_reset_expires: expires
      });
      
      // Here you would send an email with the token
      
      res.json({ success: true, message: 'If a user with that email exists, a password reset link has been sent.' });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/auth/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: 'Token and password are required' });
      }
      
      // Find user with this token
      const users = await storage.getUsers();
      const user = users.find(u => u.password_reset_token === token);
      
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }
      
      // Check if token has expired
      const now = new Date();
      if (!user.password_reset_expires || user.password_reset_expires < now) {
        return res.status(400).json({ message: 'Token has expired' });
      }
      
      // Update user's password
      await storage.updateUser(user.id, {
        password,
        password_reset_token: null,
        password_reset_expires: null
      });
      
      res.json({ success: true, message: 'Password has been reset' });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/profile', isAuthenticated, async (req, res) => {
    try {
      const profileData = updateProfileSchema.parse(req.body);
      const user = await storage.updateUser(req.user.id, profileData);
      res.json(user);
    } catch (error) {
      console.error('Profile update error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/update-username', isAuthenticated, async (req, res) => {
    try {
      const { username } = updateUsernameSchema.parse(req.body);
      
      // Check if username is already taken
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
      
      const user = await storage.updateUser(req.user.id, { username });
      res.json(user);
    } catch (error) {
      console.error('Username update error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/update-password', isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = updatePasswordSchema.parse(req.body);
      
      // Verify current password
      const user = await storage.getUser(req.user.id);
      const isValid = await require('./auth').comparePasswords(currentPassword, user.password);
      
      if (!isValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      
      // Update password
      await storage.updateUser(req.user.id, { password: newPassword });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Password update error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // ==================== Organizations Routes ====================
  
  app.get('/api/test/organizations', isAdmin, async (req, res) => {
    try {
      const organizations = await storage.getOrganizations();
      res.json(organizations);
    } catch (error) {
      console.error('Get organizations error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.get('/api/test/organizations/:id', isOrganizationAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const organization = await storage.getOrganization(id);
      
      if (!organization) {
        return res.status(404).json({ message: 'Organization not found' });
      }
      
      res.json(organization);
    } catch (error) {
      console.error('Get organization error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.put('/api/test/organizations/:id', isOrganizationAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // Validate update data
      const organization = await storage.updateOrganization(id, updateData);
      
      res.json(organization);
    } catch (error) {
      console.error('Update organization error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // ==================== User Management Routes ====================
  
  app.get('/api/test/users', isAuthenticated, async (req, res) => {
    try {
      let users: User[] = [];
      
      if (req.user.is_admin) {
        // Admins can see all users
        users = await storage.getUsers();
      } else if (req.user.role === 'user_manager') {
        // User managers can see assigned users
        users = await storage.getManagedUsers(req.user.id);
      } else {
        // Regular users can only see themselves
        const user = await storage.getUser(req.user.id);
        users = user ? [user] : [];
      }
      
      res.json(users);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.get('/api/test/organization-users', isAuthenticated, async (req, res) => {
    try {
      if (!req.user.organization_id) {
        return res.status(400).json({ message: 'User is not part of an organization' });
      }
      
      const users = await storage.getUsersByOrganization(req.user.organization_id);
      res.json(users);
    } catch (error) {
      console.error('Get organization users error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.get('/api/test/users/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check permissions
      if (req.user.id !== id && !req.user.is_admin && req.user.role !== 'user_manager') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // If user manager, check if the requested user is assigned to them
      if (req.user.role === 'user_manager' && req.user.id !== id) {
        const managedUsers = await storage.getManagedUsers(req.user.id);
        const isManaged = managedUsers.some(user => user.id === id);
        
        if (!isManaged) {
          return res.status(403).json({ message: 'Access denied. User is not assigned to you.' });
        }
      }
      
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/users', isAdmin, async (req, res) => {
    try {
      // Validate user data
      const userData = insertUserSchema.parse(req.body);
      
      // Set organization id if admin is creating the user
      if (req.user.organization_id && !userData.organization_id) {
        userData.organization_id = req.user.organization_id;
      }
      
      // Create the user
      const user = await storage.createUser(userData);
      
      res.json(user);
    } catch (error) {
      console.error('Create user error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.put('/api/test/users/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // Check permissions
      if (req.user.id !== id && !req.user.is_admin && req.user.role !== 'user_manager') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // If user manager, check if the requested user is assigned to them
      if (req.user.role === 'user_manager' && req.user.id !== id) {
        const managedUsers = await storage.getManagedUsers(req.user.id);
        const isManaged = managedUsers.some(user => user.id === id);
        
        if (!isManaged) {
          return res.status(403).json({ message: 'Access denied. User is not assigned to you.' });
        }
        
        // User managers can only update certain fields
        const allowedFields = ['firstName', 'lastName', 'email', 'companyName', 'country', 'phoneNumber'];
        const disallowedUpdates = Object.keys(updateData).filter(key => !allowedFields.includes(key));
        
        if (disallowedUpdates.length > 0) {
          return res.status(403).json({ 
            message: 'Access denied. You can only update certain user fields.',
            disallowedFields: disallowedUpdates
          });
        }
      }
      
      // Regular users can't change their role or admin status
      if (req.user.id === id && !req.user.is_admin) {
        delete updateData.is_admin;
        delete updateData.role;
      }
      
      const user = await storage.updateUser(id, updateData);
      
      res.json(user);
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // ==================== User Assignment Routes ====================
  
  app.get('/api/test/user-assignments', isAuthenticated, async (req, res) => {
    try {
      if (req.user.is_admin || req.user.role === 'user_manager') {
        const assignments = await storage.getUserAssignments(req.user.id);
        res.json(assignments);
      } else {
        // Regular users can see their managers
        const managers = await storage.getUserManagers(req.user.id);
        res.json(managers);
      }
    } catch (error) {
      console.error('Get user assignments error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/user-assignments', hasRole('user_manager'), async (req, res) => {
    try {
      // Validate assignment data
      const assignmentData = insertUserAssignmentSchema.parse(req.body);
      
      // User managers can only assign users to themselves
      if (req.user.role === 'user_manager' && assignmentData.manager_id !== req.user.id) {
        return res.status(403).json({ message: 'Access denied. You can only assign users to yourself.' });
      }
      
      // Set the assigned_by field
      assignmentData.assigned_by = req.user.id;
      
      // Create the assignment
      const assignment = await storage.assignUserToManager(assignmentData);
      
      res.json(assignment);
    } catch (error) {
      console.error('Create user assignment error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.delete('/api/test/user-assignments/:managerId/:userId', hasRole('user_manager'), async (req, res) => {
    try {
      const managerId = parseInt(req.params.managerId);
      const userId = parseInt(req.params.userId);
      
      // User managers can only remove their own assignments
      if (req.user.role === 'user_manager' && managerId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied. You can only remove your own assignments.' });
      }
      
      await storage.removeUserAssignment(managerId, userId);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete user assignment error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // ==================== Domain Routes ====================
  
  app.get('/api/test/domains', isAuthenticated, async (req, res) => {
    try {
      let domains: Domain[] = [];
      
      if (req.user.is_admin) {
        // Admins can see all domains
        domains = await storage.getDomains();
      } else if (req.user.role === 'inventory_manager') {
        // Inventory managers can see all domains in their organization
        domains = await storage.getOrganizationDomains(req.user.organization_id);
      } else {
        // Regular users can see global domains and their own domains
        const globalDomains = await storage.getGlobalDomains();
        const userDomains = await storage.getUserDomains(req.user.id);
        
        domains = [...globalDomains, ...userDomains];
      }
      
      res.json(domains);
    } catch (error) {
      console.error('Get domains error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.get('/api/test/domains/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const domain = await storage.getDomain(id);
      
      if (!domain) {
        return res.status(404).json({ message: 'Domain not found' });
      }
      
      // Check permissions
      if (!req.user.is_admin && req.user.role !== 'inventory_manager') {
        if (!domain.isGlobal && domain.userId !== req.user.id) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
      
      res.json(domain);
    } catch (error) {
      console.error('Get domain error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/domains', isAuthenticated, async (req, res) => {
    try {
      // Validate domain data
      const domainData = insertDomainSchema.parse(req.body);
      
      // Set created_by field
      domainData.created_by = req.user.id;
      
      // Set organization_id if available
      if (req.user.organization_id) {
        domainData.organization_id = req.user.organization_id;
      }
      
      let domain: Domain;
      
      if (req.user.is_admin || req.user.role === 'inventory_manager') {
        // Admins and inventory managers can create global domains
        domain = await storage.createDomain(domainData);
      } else {
        // Regular users create domains for themselves
        domain = await storage.createUserDomain(req.user.id, domainData);
      }
      
      res.json(domain);
    } catch (error) {
      console.error('Create domain error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.put('/api/test/domains/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // Get the domain
      const domain = await storage.getDomain(id);
      
      if (!domain) {
        return res.status(404).json({ message: 'Domain not found' });
      }
      
      // Check permissions
      if (!req.user.is_admin && req.user.role !== 'inventory_manager') {
        if (!domain.isGlobal && domain.userId !== req.user.id) {
          return res.status(403).json({ message: 'Access denied' });
        }
        
        // Regular users can't change certain fields
        delete updateData.isGlobal;
        delete updateData.userId;
        delete updateData.created_by;
      }
      
      // Update domain
      const updatedDomain = await storage.updateDomain(id, updateData);
      
      res.json(updatedDomain);
    } catch (error) {
      console.error('Update domain error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.delete('/api/test/domains/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the domain
      const domain = await storage.getDomain(id);
      
      if (!domain) {
        return res.status(404).json({ message: 'Domain not found' });
      }
      
      // Check permissions
      if (!req.user.is_admin && req.user.role !== 'inventory_manager') {
        if (!domain.isGlobal && domain.userId !== req.user.id) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
      
      await storage.deleteDomain(id);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete domain error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // ==================== Domain Pricing Routes ====================
  
  app.get('/api/test/domain-pricing/:domainId/:userId', isAuthenticated, async (req, res) => {
    try {
      const domainId = parseInt(req.params.domainId);
      const userId = parseInt(req.params.userId);
      
      // Check permissions
      if (req.user.id !== userId && !req.user.is_admin) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const pricing = await storage.getDomainPricing(domainId, userId);
      
      if (!pricing) {
        return res.status(404).json({ message: 'Domain pricing not found' });
      }
      
      res.json(pricing);
    } catch (error) {
      console.error('Get domain pricing error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/domain-pricing', isAdmin, async (req, res) => {
    try {
      // Validate pricing data
      const pricingData = insertDomainPricingSchema.parse(req.body);
      
      // Set created_by field
      pricingData.createdBy = req.user.id;
      
      // Create or update pricing
      const pricing = await storage.setDomainPricing(pricingData);
      
      res.json(pricing);
    } catch (error) {
      console.error('Set domain pricing error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.delete('/api/test/domain-pricing/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      await storage.deleteDomainPricing(id);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete domain pricing error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // ==================== Pricing Tier Routes ====================
  
  app.get('/api/test/pricing-tiers', isAuthenticated, async (req, res) => {
    try {
      if (!req.user.organization_id) {
        return res.status(400).json({ message: 'User is not part of an organization' });
      }
      
      const tiers = await storage.getPricingTiers(req.user.organization_id);
      res.json(tiers);
    } catch (error) {
      console.error('Get pricing tiers error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/pricing-tiers', isAdmin, async (req, res) => {
    try {
      // Validate tier data
      const tierData = insertPricingTierSchema.parse(req.body);
      
      // Set created_by field
      tierData.createdBy = req.user.id;
      
      // Set organization_id
      if (req.user.organization_id) {
        tierData.organization_id = req.user.organization_id;
      }
      
      // Create tier
      const tier = await storage.createPricingTier(tierData);
      
      res.json(tier);
    } catch (error) {
      console.error('Create pricing tier error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.put('/api/test/pricing-tiers/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // Update tier
      const tier = await storage.updatePricingTier(id, updateData);
      
      res.json(tier);
    } catch (error) {
      console.error('Update pricing tier error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.delete('/api/test/pricing-tiers/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      await storage.deletePricingTier(id);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete pricing tier error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // ==================== User Pricing Tier Routes ====================
  
  app.post('/api/test/user-pricing-tiers', isAdmin, async (req, res) => {
    try {
      // Validate data
      const tierData = insertUserPricingTierSchema.parse(req.body);
      
      // Set assigned_by field
      tierData.assignedBy = req.user.id;
      
      // Assign tier
      const assignment = await storage.assignPricingTierToUser(tierData);
      
      res.json(assignment);
    } catch (error) {
      console.error('Assign pricing tier error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.delete('/api/test/user-pricing-tiers/:userId/:tierId', isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const tierId = parseInt(req.params.tierId);
      
      await storage.removeUserPricingTier(userId, tierId);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Remove pricing tier error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.get('/api/test/user-pricing-tiers/:userId', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Check permissions
      if (req.user.id !== userId && !req.user.is_admin) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const tiers = await storage.getUserPricingTiers(userId);
      res.json(tiers);
    } catch (error) {
      console.error('Get user pricing tiers error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // ==================== Order Routes ====================
  
  app.get('/api/test/orders', isAuthenticated, async (req, res) => {
    try {
      let orders: Order[] = [];
      
      if (req.user.is_admin) {
        // Admins can see all orders
        orders = await storage.getAllOrders();
      } else if (req.user.role === 'user_manager') {
        // User managers can see orders from their assigned users
        orders = await storage.getManagedUserOrders(req.user.id);
      } else {
        // Regular users can see their own orders
        orders = await storage.getOrders(req.user.id);
      }
      
      res.json(orders);
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.get('/api/test/orders/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Check permissions
      if (req.user.id !== order.userId && !req.user.is_admin && req.user.role !== 'user_manager') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // If user manager, check if the order belongs to a managed user
      if (req.user.role === 'user_manager' && req.user.id !== order.userId) {
        const managedUsers = await storage.getManagedUsers(req.user.id);
        const isManaged = managedUsers.some(user => user.id === order.userId);
        
        if (!isManaged) {
          return res.status(403).json({ message: 'Access denied. Order does not belong to your managed users.' });
        }
      }
      
      res.json(order);
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/orders', isAuthenticated, async (req, res) => {
    try {
      // Validate order data
      const orderData = insertOrderSchema.parse(req.body);
      
      // Set created_by field
      orderData.created_by = req.user.id;
      
      // Set organization_id if available
      if (req.user.organization_id) {
        orderData.organization_id = req.user.organization_id;
      }
      
      // User managers can create orders for managed users
      if (req.user.role === 'user_manager' && orderData.userId !== req.user.id) {
        const managedUsers = await storage.getManagedUsers(req.user.id);
        const isManaged = managedUsers.some(user => user.id === orderData.userId);
        
        if (!isManaged) {
          return res.status(403).json({ message: 'Access denied. You can only create orders for your managed users.' });
        }
      } else if (!req.user.is_admin && orderData.userId !== req.user.id) {
        // Regular users can only create orders for themselves
        return res.status(403).json({ message: 'Access denied. You can only create orders for yourself.' });
      }
      
      // Create order
      const order = await storage.createOrder(orderData);
      
      res.json(order);
    } catch (error) {
      console.error('Create order error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.put('/api/test/orders/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // Get order
      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Check permissions
      if (req.user.id !== order.userId && !req.user.is_admin && req.user.role !== 'user_manager') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // If user manager, check if the order belongs to a managed user
      if (req.user.role === 'user_manager' && req.user.id !== order.userId) {
        const managedUsers = await storage.getManagedUsers(req.user.id);
        const isManaged = managedUsers.some(user => user.id === order.userId);
        
        if (!isManaged) {
          return res.status(403).json({ message: 'Access denied. Order does not belong to your managed users.' });
        }
      }
      
      // Regular users can't update certain fields
      if (!req.user.is_admin && req.user.role !== 'user_manager') {
        const restrictedFields = ['status', 'dateCompleted', 'assigned_to'];
        for (const field of restrictedFields) {
          delete updateData[field];
        }
      }
      
      // Update order
      const updatedOrder = await storage.updateOrder(id, updateData);
      
      res.json(updatedOrder);
    } catch (error) {
      console.error('Update order error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.delete('/api/test/orders/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get order
      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Only admins can delete orders
      if (!req.user.is_admin) {
        return res.status(403).json({ message: 'Access denied. Only admins can delete orders.' });
      }
      
      await storage.deleteOrder(id);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete order error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // ==================== Order Comment Routes ====================
  
  app.get('/api/test/order-comments/:orderId', isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      
      // Get order
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Check permissions
      if (req.user.id !== order.userId && !req.user.is_admin && req.user.role !== 'user_manager') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // If user manager, check if the order belongs to a managed user
      if (req.user.role === 'user_manager' && req.user.id !== order.userId) {
        const managedUsers = await storage.getManagedUsers(req.user.id);
        const isManaged = managedUsers.some(user => user.id === order.userId);
        
        if (!isManaged) {
          return res.status(403).json({ message: 'Access denied. Order does not belong to your managed users.' });
        }
      }
      
      const comments = await storage.getOrderComments(orderId);
      
      // Mark comments as read for the current user
      await storage.markCommentsAsRead(orderId, req.user.id);
      
      res.json(comments);
    } catch (error) {
      console.error('Get order comments error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/order-comments', isAuthenticated, async (req, res) => {
    try {
      // Validate comment data
      const commentData = insertOrderCommentSchema.parse(req.body);
      
      // Get order
      const order = await storage.getOrder(commentData.orderId);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Check permissions
      if (req.user.id !== order.userId && !req.user.is_admin && req.user.role !== 'user_manager') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // If user manager, check if the order belongs to a managed user
      if (req.user.role === 'user_manager' && req.user.id !== order.userId) {
        const managedUsers = await storage.getManagedUsers(req.user.id);
        const isManaged = managedUsers.some(user => user.id === order.userId);
        
        if (!isManaged) {
          return res.status(403).json({ message: 'Access denied. Order does not belong to your managed users.' });
        }
      }
      
      // Set comment user ID
      commentData.userId = req.user.id;
      
      // Determine if comment is from admin or user manager
      const isFromAdmin = req.user.is_admin || req.user.role === 'user_manager';
      
      // Create comment
      const comment = await storage.createOrderComment({
        ...commentData,
        isFromAdmin
      });
      
      // Create notification for the order owner if the comment is not from them
      if (req.user.id !== order.userId) {
        await storage.createNotification({
          userId: order.userId,
          title: 'New Comment',
          message: `You have a new comment on order #${order.id}`,
          type: 'comment',
          relatedId: order.id,
          relatedType: 'order'
        });
      }
      
      // Create notification for admins if comment is from a user
      if (!isFromAdmin) {
        const admins = await storage.getUsersByRole('admin');
        
        for (const admin of admins) {
          if (admin.id !== req.user.id) {
            await storage.createNotification({
              userId: admin.id,
              title: 'New User Comment',
              message: `User ${req.user.username} left a comment on order #${order.id}`,
              type: 'comment',
              relatedId: order.id,
              relatedType: 'order'
            });
          }
        }
      }
      
      res.json(comment);
    } catch (error) {
      console.error('Create order comment error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // ==================== Support Ticket Routes ====================
  
  app.get('/api/test/support-tickets', isAuthenticated, async (req, res) => {
    try {
      let tickets: SupportTicket[] = [];
      
      if (req.user.is_admin) {
        // Admins can see all tickets
        tickets = await storage.getAllSupportTickets();
      } else if (req.user.role === 'user_manager') {
        // User managers can see tickets from their assigned users
        const managedUsers = await storage.getManagedUsers(req.user.id);
        
        if (managedUsers.length > 0) {
          const managedUserIds = managedUsers.map(user => user.id);
          const allTickets = await storage.getAllSupportTickets();
          
          tickets = allTickets.filter(ticket => 
            managedUserIds.includes(ticket.userId) || ticket.assigned_to === req.user.id);
        }
      } else {
        // Regular users can see their own tickets
        tickets = await storage.getSupportTickets(req.user.id);
      }
      
      res.json(tickets);
    } catch (error) {
      console.error('Get support tickets error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.get('/api/test/support-tickets/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ticket = await storage.getSupportTicket(id);
      
      if (!ticket) {
        return res.status(404).json({ message: 'Support ticket not found' });
      }
      
      // Check permissions
      if (req.user.id !== ticket.userId && !req.user.is_admin && req.user.id !== ticket.assigned_to) {
        // If user manager, check if the ticket belongs to a managed user
        if (req.user.role === 'user_manager') {
          const managedUsers = await storage.getManagedUsers(req.user.id);
          const isManaged = managedUsers.some(user => user.id === ticket.userId);
          
          if (!isManaged) {
            return res.status(403).json({ message: 'Access denied. Ticket does not belong to your managed users.' });
          }
        } else {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
      
      res.json(ticket);
    } catch (error) {
      console.error('Get support ticket error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/support-tickets', isAuthenticated, async (req, res) => {
    try {
      // Validate ticket data
      const ticketData = insertTicketSchema.parse(req.body);
      
      // Set user ID if not specified
      if (!ticketData.userId) {
        ticketData.userId = req.user.id;
      }
      
      // Check if the user is allowed to create a ticket for another user
      if (ticketData.userId !== req.user.id && !req.user.is_admin) {
        if (req.user.role === 'user_manager') {
          const managedUsers = await storage.getManagedUsers(req.user.id);
          const isManaged = managedUsers.some(user => user.id === ticketData.userId);
          
          if (!isManaged) {
            return res.status(403).json({ message: 'Access denied. You can only create tickets for your managed users.' });
          }
        } else {
          return res.status(403).json({ message: 'Access denied. You can only create tickets for yourself.' });
        }
      }
      
      // Set organization_id if available
      if (req.user.organization_id) {
        ticketData.organization_id = req.user.organization_id;
      }
      
      // Create the ticket
      const ticket = await storage.createSupportTicket(ticketData);
      
      // Create notification for admins
      const admins = await storage.getUsersByRole('admin');
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          title: 'New Support Ticket',
          message: `A new support ticket has been created: ${ticket.title}`,
          type: 'ticket',
          relatedId: ticket.id,
          relatedType: 'ticket'
        });
      }
      
      res.json(ticket);
    } catch (error) {
      console.error('Create support ticket error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.put('/api/test/support-tickets/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Validate update data
      const updateData = updateTicketSchema.parse(req.body);
      
      // Get ticket
      const ticket = await storage.getSupportTicket(id);
      
      if (!ticket) {
        return res.status(404).json({ message: 'Support ticket not found' });
      }
      
      // Check permissions
      if (!req.user.is_admin && req.user.id !== ticket.assigned_to) {
        // Regular users can only update their own tickets
        if (req.user.id !== ticket.userId) {
          return res.status(403).json({ message: 'Access denied. You can only update your own tickets.' });
        }
        
        // Regular users can only update certain fields
        const allowedFields = ['title', 'description'];
        const disallowedUpdates = Object.keys(updateData).filter(key => !allowedFields.includes(key));
        
        if (disallowedUpdates.length > 0) {
          return res.status(403).json({ 
            message: 'Access denied. You can only update certain ticket fields.',
            disallowedFields: disallowedUpdates
          });
        }
      }
      
      // Update ticket
      const updatedTicket = await storage.updateSupportTicket(id, updateData);
      
      // If status changed, create notification for the ticket owner
      if (updateData.status && updateData.status !== ticket.status) {
        await storage.createNotification({
          userId: ticket.userId,
          title: 'Ticket Status Updated',
          message: `Your support ticket #${ticket.id} status has been changed to ${updateData.status}`,
          type: 'ticket',
          relatedId: ticket.id,
          relatedType: 'ticket'
        });
      }
      
      // If assigned_to changed, create notification for the new assignee
      if (updateData.assigned_to && updateData.assigned_to !== ticket.assigned_to) {
        await storage.createNotification({
          userId: updateData.assigned_to,
          title: 'Ticket Assigned',
          message: `Support ticket #${ticket.id} has been assigned to you`,
          type: 'ticket',
          relatedId: ticket.id,
          relatedType: 'ticket'
        });
      }
      
      res.json(updatedTicket);
    } catch (error) {
      console.error('Update support ticket error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/support-tickets/:id/close', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { rating, feedback } = req.body;
      
      // Get ticket
      const ticket = await storage.getSupportTicket(id);
      
      if (!ticket) {
        return res.status(404).json({ message: 'Support ticket not found' });
      }
      
      // Check permissions
      if (!req.user.is_admin && req.user.id !== ticket.userId) {
        return res.status(403).json({ message: 'Access denied. Only admins or the ticket owner can close tickets.' });
      }
      
      // Close ticket
      const closedTicket = await storage.closeSupportTicket(id, rating, feedback);
      
      // Create notification for admins if closed by user
      if (!req.user.is_admin) {
        const admins = await storage.getUsersByRole('admin');
        for (const admin of admins) {
          await storage.createNotification({
            userId: admin.id,
            title: 'Ticket Closed',
            message: `Support ticket #${ticket.id} has been closed by the user`,
            type: 'ticket',
            relatedId: ticket.id,
            relatedType: 'ticket'
          });
        }
      } 
      // Create notification for user if closed by admin
      else if (req.user.id !== ticket.userId) {
        await storage.createNotification({
          userId: ticket.userId,
          title: 'Ticket Closed',
          message: `Your support ticket #${ticket.id} has been closed by an admin`,
          type: 'ticket',
          relatedId: ticket.id,
          relatedType: 'ticket'
        });
      }
      
      res.json(closedTicket);
    } catch (error) {
      console.error('Close support ticket error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // ==================== Ticket Comment Routes ====================
  
  app.get('/api/test/ticket-comments/:ticketId', isAuthenticated, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      
      // Get ticket
      const ticket = await storage.getSupportTicket(ticketId);
      
      if (!ticket) {
        return res.status(404).json({ message: 'Support ticket not found' });
      }
      
      // Check permissions
      if (req.user.id !== ticket.userId && !req.user.is_admin && req.user.id !== ticket.assigned_to) {
        // If user manager, check if the ticket belongs to a managed user
        if (req.user.role === 'user_manager') {
          const managedUsers = await storage.getManagedUsers(req.user.id);
          const isManaged = managedUsers.some(user => user.id === ticket.userId);
          
          if (!isManaged) {
            return res.status(403).json({ message: 'Access denied. Ticket does not belong to your managed users.' });
          }
        } else {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
      
      const comments = await storage.getTicketComments(ticketId);
      
      // Filter out internal comments for non-admins
      if (!req.user.is_admin && req.user.id !== ticket.assigned_to) {
        const filteredComments = comments.filter(comment => !comment.isInternal);
        res.json(filteredComments);
      } else {
        res.json(comments);
      }
    } catch (error) {
      console.error('Get ticket comments error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/ticket-comments', isAuthenticated, async (req, res) => {
    try {
      // Validate comment data
      const commentData = insertTicketCommentSchema.parse(req.body);
      
      // Get ticket
      const ticket = await storage.getSupportTicket(commentData.ticketId);
      
      if (!ticket) {
        return res.status(404).json({ message: 'Support ticket not found' });
      }
      
      // Check permissions
      if (req.user.id !== ticket.userId && !req.user.is_admin && req.user.id !== ticket.assigned_to) {
        // If user manager, check if the ticket belongs to a managed user
        if (req.user.role === 'user_manager') {
          const managedUsers = await storage.getManagedUsers(req.user.id);
          const isManaged = managedUsers.some(user => user.id === ticket.userId);
          
          if (!isManaged) {
            return res.status(403).json({ message: 'Access denied. Ticket does not belong to your managed users.' });
          }
        } else {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
      
      // Regular users can't make internal comments
      if (!req.user.is_admin && req.user.id !== ticket.assigned_to) {
        commentData.isInternal = false;
      }
      
      // Set user ID
      commentData.userId = req.user.id;
      
      // Create comment
      const comment = await storage.createTicketComment(commentData);
      
      // Update ticket status if it's currently closed
      if (ticket.status === 'closed') {
        await storage.updateSupportTicket(ticket.id, { 
          status: 'open',
          updatedAt: new Date()
        });
      }
      
      // Create notification for the ticket owner if comment is from admin/staff
      if ((req.user.is_admin || req.user.id === ticket.assigned_to) && req.user.id !== ticket.userId) {
        await storage.createNotification({
          userId: ticket.userId,
          title: 'New Ticket Comment',
          message: `You have a new comment on your support ticket #${ticket.id}`,
          type: 'ticket_comment',
          relatedId: ticket.id,
          relatedType: 'ticket'
        });
      }
      
      // Create notification for admins if comment is from user
      if (!req.user.is_admin && req.user.id === ticket.userId) {
        const admins = await storage.getUsersByRole('admin');
        
        for (const admin of admins) {
          await storage.createNotification({
            userId: admin.id,
            title: 'New User Comment on Ticket',
            message: `User ${req.user.username} left a comment on ticket #${ticket.id}`,
            type: 'ticket_comment',
            relatedId: ticket.id,
            relatedType: 'ticket'
          });
        }
        
        // Also notify the assigned support staff
        if (ticket.assigned_to && ticket.assigned_to !== req.user.id) {
          await storage.createNotification({
            userId: ticket.assigned_to,
            title: 'New User Comment on Ticket',
            message: `User ${req.user.username} left a comment on ticket #${ticket.id}`,
            type: 'ticket_comment',
            relatedId: ticket.id,
            relatedType: 'ticket'
          });
        }
      }
      
      res.json(comment);
    } catch (error) {
      console.error('Create ticket comment error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // ==================== Feedback Question Routes ====================
  
  app.get('/api/test/feedback-questions', isAuthenticated, async (req, res) => {
    try {
      if (!req.user.organization_id) {
        return res.status(400).json({ message: 'User is not part of an organization' });
      }
      
      const questions = await storage.getFeedbackQuestions(req.user.organization_id);
      res.json(questions);
    } catch (error) {
      console.error('Get feedback questions error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.get('/api/test/active-feedback-questions', isAuthenticated, async (req, res) => {
    try {
      if (!req.user.organization_id) {
        return res.status(400).json({ message: 'User is not part of an organization' });
      }
      
      const questions = await storage.getActiveFeedbackQuestions(req.user.organization_id);
      res.json(questions);
    } catch (error) {
      console.error('Get active feedback questions error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/feedback-questions', isAdmin, async (req, res) => {
    try {
      // Validate question data
      const questionData = insertFeedbackQuestionSchema.parse(req.body);
      
      // Set createdBy field
      questionData.createdBy = req.user.id;
      
      // Set organization_id
      if (req.user.organization_id) {
        questionData.organization_id = req.user.organization_id;
      }
      
      // Create question
      const question = await storage.createFeedbackQuestion(questionData);
      
      res.json(question);
    } catch (error) {
      console.error('Create feedback question error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.put('/api/test/feedback-questions/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // Update question
      const question = await storage.updateFeedbackQuestion(id, updateData);
      
      res.json(question);
    } catch (error) {
      console.error('Update feedback question error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/feedback-questions/:id/toggle', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Toggle question active status
      const question = await storage.toggleFeedbackQuestionStatus(id);
      
      res.json(question);
    } catch (error) {
      console.error('Toggle feedback question error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/feedback-questions/reorder', isAdmin, async (req, res) => {
    try {
      const { questionIds } = req.body;
      
      if (!Array.isArray(questionIds)) {
        return res.status(400).json({ message: 'questionIds must be an array' });
      }
      
      // Reorder questions
      const questions = await storage.reorderFeedbackQuestions(questionIds);
      
      res.json(questions);
    } catch (error) {
      console.error('Reorder feedback questions error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // ==================== Feedback Campaign Routes ====================
  
  app.get('/api/test/feedback-campaigns', isAuthenticated, async (req, res) => {
    try {
      if (!req.user.organization_id) {
        return res.status(400).json({ message: 'User is not part of an organization' });
      }
      
      const campaigns = await storage.getFeedbackCampaigns(req.user.organization_id);
      res.json(campaigns);
    } catch (error) {
      console.error('Get feedback campaigns error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.get('/api/test/active-feedback-campaigns', isAuthenticated, async (req, res) => {
    try {
      if (!req.user.organization_id) {
        return res.status(400).json({ message: 'User is not part of an organization' });
      }
      
      const campaigns = await storage.getActiveFeedbackCampaigns(req.user.organization_id);
      res.json(campaigns);
    } catch (error) {
      console.error('Get active feedback campaigns error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.get('/api/test/feedback-campaigns/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const campaign = await storage.getFeedbackCampaign(id);
      
      if (!campaign) {
        return res.status(404).json({ message: 'Feedback campaign not found' });
      }
      
      res.json(campaign);
    } catch (error) {
      console.error('Get feedback campaign error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/feedback-campaigns', isAdmin, async (req, res) => {
    try {
      // Validate campaign data
      const campaignData = insertFeedbackCampaignSchema.parse(req.body);
      
      // Set createdBy field
      campaignData.createdBy = req.user.id;
      
      // Set organization_id
      if (req.user.organization_id) {
        campaignData.organization_id = req.user.organization_id;
      }
      
      // Create campaign
      const campaign = await storage.createFeedbackCampaign(campaignData);
      
      res.json(campaign);
    } catch (error) {
      console.error('Create feedback campaign error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.put('/api/test/feedback-campaigns/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // Update campaign
      const campaign = await storage.updateFeedbackCampaign(id, updateData);
      
      res.json(campaign);
    } catch (error) {
      console.error('Update feedback campaign error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/feedback-campaigns/:id/toggle', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Toggle campaign active status
      const campaign = await storage.toggleFeedbackCampaignStatus(id);
      
      res.json(campaign);
    } catch (error) {
      console.error('Toggle feedback campaign error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/feedback-campaigns/:id/generate', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Generate feedback requests for this campaign
      const count = await storage.generateCampaignFeedbackRequests(id);
      
      res.json({ success: true, requestsCreated: count });
    } catch (error) {
      console.error('Generate feedback requests error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/feedback-campaigns/:campaignId/questions/:questionId', isAdmin, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const questionId = parseInt(req.params.questionId);
      const { sortOrder } = req.body;
      
      if (typeof sortOrder !== 'number') {
        return res.status(400).json({ message: 'sortOrder must be a number' });
      }
      
      // Add question to campaign
      await storage.addQuestionToCampaign(campaignId, questionId, sortOrder);
      
      // Get updated questions for this campaign
      const questions = await storage.getCampaignQuestions(campaignId);
      
      res.json(questions);
    } catch (error) {
      console.error('Add question to campaign error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.delete('/api/test/feedback-campaigns/:campaignId/questions/:questionId', isAdmin, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const questionId = parseInt(req.params.questionId);
      
      // Remove question from campaign
      await storage.removeQuestionFromCampaign(campaignId, questionId);
      
      // Get updated questions for this campaign
      const questions = await storage.getCampaignQuestions(campaignId);
      
      res.json(questions);
    } catch (error) {
      console.error('Remove question from campaign error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.get('/api/test/feedback-campaigns/:id/questions', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get questions for this campaign
      const questions = await storage.getCampaignQuestions(id);
      
      res.json(questions);
    } catch (error) {
      console.error('Get campaign questions error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // ==================== Feedback Routes ====================
  
  app.get('/api/test/feedback', isAuthenticated, async (req, res) => {
    try {
      let feedback: Feedback[] = [];
      
      if (req.user.is_admin) {
        // Admins can see all feedback for their organization
        if (req.user.organization_id) {
          feedback = await storage.getAllFeedback(req.user.organization_id);
        }
      } else if (req.user.role === 'user_manager') {
        // User managers can see feedback from their assigned users
        const managedUsers = await storage.getManagedUsers(req.user.id);
        
        if (managedUsers.length > 0) {
          const managedUserIds = managedUsers.map(user => user.id);
          const allFeedback = req.user.organization_id ? 
            await storage.getAllFeedback(req.user.organization_id) : [];
          
          feedback = allFeedback.filter(fb => managedUserIds.includes(fb.userId));
        }
      } else {
        // Regular users can see their own feedback
        feedback = await storage.getUserFeedback(req.user.id);
      }
      
      res.json(feedback);
    } catch (error) {
      console.error('Get feedback error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.get('/api/test/feedback/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const feedback = await storage.getFeedback(id);
      
      if (!feedback) {
        return res.status(404).json({ message: 'Feedback not found' });
      }
      
      // Check permissions
      if (req.user.id !== feedback.userId && !req.user.is_admin) {
        // If user manager, check if the feedback belongs to a managed user
        if (req.user.role === 'user_manager') {
          const managedUsers = await storage.getManagedUsers(req.user.id);
          const isManaged = managedUsers.some(user => user.id === feedback.userId);
          
          if (!isManaged) {
            return res.status(403).json({ message: 'Access denied. Feedback does not belong to your managed users.' });
          }
        } else {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
      
      res.json(feedback);
    } catch (error) {
      console.error('Get feedback error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/feedback', isAuthenticated, async (req, res) => {
    try {
      // Validate feedback data
      const feedbackData = insertFeedbackSchema.parse(req.body);
      
      // Check permissions if submitting for another user
      if (feedbackData.userId !== req.user.id && !req.user.is_admin) {
        return res.status(403).json({ message: 'Access denied. You can only submit feedback for yourself.' });
      }
      
      // Set organization_id if available
      if (req.user.organization_id) {
        feedbackData.organization_id = req.user.organization_id;
      }
      
      // Create feedback
      const feedback = await storage.createFeedback(feedbackData);
      
      res.json(feedback);
    } catch (error) {
      console.error('Create feedback error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.put('/api/test/feedback/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // Get feedback
      const feedback = await storage.getFeedback(id);
      
      if (!feedback) {
        return res.status(404).json({ message: 'Feedback not found' });
      }
      
      // Check permissions
      if (req.user.id !== feedback.userId && !req.user.is_admin) {
        return res.status(403).json({ message: 'Access denied. You can only update your own feedback.' });
      }
      
      // Update feedback
      const updatedFeedback = await storage.updateFeedback(id, updateData);
      
      // If feedback was completed, notify admins
      if (updateData.isCompleted && updateData.isCompleted !== feedback.isCompleted) {
        const admins = await storage.getUsersByRole('admin');
        
        for (const admin of admins) {
          await storage.createNotification({
            userId: admin.id,
            title: 'Feedback Completed',
            message: `User ${req.user.username} has completed their feedback`,
            type: 'feedback',
            relatedId: updatedFeedback.id,
            relatedType: 'feedback'
          });
        }
      }
      
      res.json(updatedFeedback);
    } catch (error) {
      console.error('Update feedback error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.get('/api/test/user-average-rating/:userId', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Check permissions
      if (req.user.id !== userId && !req.user.is_admin && req.user.role !== 'user_manager') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // If user manager, check if the user is assigned to them
      if (req.user.role === 'user_manager' && req.user.id !== userId) {
        const managedUsers = await storage.getManagedUsers(req.user.id);
        const isManaged = managedUsers.some(user => user.id === userId);
        
        if (!isManaged) {
          return res.status(403).json({ message: 'Access denied. User is not assigned to you.' });
        }
      }
      
      const averageRating = await storage.getUserAverageRating(userId);
      
      res.json({ averageRating });
    } catch (error) {
      console.error('Get user average rating error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.get('/api/test/feedback-needed/:campaignId', isAuthenticated, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      
      const feedbackNeeded = await storage.checkFeedbackNeeded(req.user.id, campaignId);
      
      res.json({ feedbackNeeded });
    } catch (error) {
      console.error('Check feedback needed error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // ==================== Order Feedback Routes ====================
  
  app.get('/api/test/order-feedback/:orderId', isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      
      // Get order
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Check permissions
      if (req.user.id !== order.userId && !req.user.is_admin && req.user.role !== 'user_manager') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const feedback = await storage.getOrderFeedback(orderId);
      
      res.json(feedback);
    } catch (error) {
      console.error('Get order feedback error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/order-feedback', isAuthenticated, async (req, res) => {
    try {
      // Validate feedback data
      const feedbackData = insertOrderFeedbackSchema.parse(req.body);
      
      // Get order
      const order = await storage.getOrder(feedbackData.orderId);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Check permissions
      if (req.user.id !== order.userId && !req.user.is_admin) {
        return res.status(403).json({ message: 'Access denied. You can only provide feedback for your own orders.' });
      }
      
      // Set user ID if not provided
      if (!feedbackData.userId) {
        feedbackData.userId = req.user.id;
      }
      
      // Set organization_id if available
      if (req.user.organization_id) {
        feedbackData.organization_id = req.user.organization_id;
      }
      
      // Create feedback
      const feedback = await storage.createOrderFeedback(feedbackData);
      
      // Notify admins
      const admins = await storage.getUsersByRole('admin');
      
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          title: 'Order Feedback Received',
          message: `User ${req.user.username} has provided feedback for order #${order.id}`,
          type: 'order_feedback',
          relatedId: order.id,
          relatedType: 'order'
        });
      }
      
      res.json(feedback);
    } catch (error) {
      console.error('Create order feedback error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // ==================== Notification Routes ====================
  
  app.get('/api/test/notifications', isAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get notification
      const notifications = await storage.getNotifications(req.user.id);
      const notification = notifications.find(n => n.id === id);
      
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      
      // Check permissions
      if (notification.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied. You can only mark your own notifications as read.' });
      }
      
      const updatedNotification = await storage.markNotificationAsRead(id);
      
      res.json(updatedNotification);
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/notifications/read-all', isAuthenticated, async (req, res) => {
    try {
      await storage.markAllNotificationsAsRead(req.user.id);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // ==================== Invoice Routes ====================
  
  app.get('/api/test/invoices', isAuthenticated, async (req, res) => {
    try {
      let invoices: Invoice[] = [];
      
      if (req.user.is_admin) {
        // Admins can see all invoices for their organization
        if (req.user.organization_id) {
          invoices = await storage.getOrganizationInvoices(req.user.organization_id);
        } else {
          invoices = await storage.getAllInvoices();
        }
      } else if (req.user.role === 'user_manager') {
        // User managers can see invoices from their assigned users
        const managedUsers = await storage.getManagedUsers(req.user.id);
        
        if (managedUsers.length > 0) {
          const managedUserIds = managedUsers.map(user => user.id);
          const allInvoices = await storage.getAllInvoices();
          
          invoices = allInvoices.filter(invoice => managedUserIds.includes(invoice.userId));
        }
      } else {
        // Regular users can see their own invoices
        invoices = await storage.getInvoices(req.user.id);
      }
      
      res.json(invoices);
    } catch (error) {
      console.error('Get invoices error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.get('/api/test/invoices/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);
      
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      // Check permissions
      if (req.user.id !== invoice.userId && !req.user.is_admin) {
        // If user manager, check if the invoice belongs to a managed user
        if (req.user.role === 'user_manager') {
          const managedUsers = await storage.getManagedUsers(req.user.id);
          const isManaged = managedUsers.some(user => user.id === invoice.userId);
          
          if (!isManaged) {
            return res.status(403).json({ message: 'Access denied. Invoice does not belong to your managed users.' });
          }
        } else {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
      
      res.json(invoice);
    } catch (error) {
      console.error('Get invoice error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/invoices', isAdmin, async (req, res) => {
    try {
      // Validate invoice data
      const invoiceData = insertInvoiceSchema.parse(req.body);
      
      // Set created_by field
      invoiceData.created_by = req.user.id;
      
      // Set organization_id if available
      if (req.user.organization_id) {
        invoiceData.organization_id = req.user.organization_id;
      }
      
      // Create invoice
      const invoice = await storage.createInvoice(invoiceData);
      
      // Create notification for the user
      await storage.createNotification({
        userId: invoice.userId,
        title: 'New Invoice',
        message: `You have a new invoice for $${invoice.amount} due on ${new Date(invoice.dueDate).toLocaleDateString()}`,
        type: 'invoice',
        relatedId: invoice.id,
        relatedType: 'invoice'
      });
      
      res.json(invoice);
    } catch (error) {
      console.error('Create invoice error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.put('/api/test/invoices/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // Update invoice
      const invoice = await storage.updateInvoice(id, updateData);
      
      // If status changed to paid, create notification
      if (updateData.status === 'paid') {
        await storage.createNotification({
          userId: invoice.userId,
          title: 'Invoice Marked as Paid',
          message: `Your invoice for $${invoice.amount} has been marked as paid`,
          type: 'invoice',
          relatedId: invoice.id,
          relatedType: 'invoice'
        });
      }
      
      res.json(invoice);
    } catch (error) {
      console.error('Update invoice error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  app.post('/api/test/invoices/:id/mark-paid', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Mark invoice as paid
      const invoice = await storage.markInvoiceAsPaid(id);
      
      // Create notification
      await storage.createNotification({
        userId: invoice.userId,
        title: 'Invoice Marked as Paid',
        message: `Your invoice for $${invoice.amount} has been marked as paid`,
        type: 'invoice',
        relatedId: invoice.id,
        relatedType: 'invoice'
      });
      
      res.json(invoice);
    } catch (error) {
      console.error('Mark invoice as paid error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Return the server instance
  const server = app.listen(process.env.PORT || 5000);
  return server;
}