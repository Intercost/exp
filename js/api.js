/**
 * EXP SUPPLIER NETWORK — API layer (Supabase implementation)
 * --------------------------------------------------------------------------
 * Uses Supabase for data persistence with local caching
 *
 * Every function returns a Promise resolving to:
 *   { ok: boolean, data: any, error: string|null }
 */
const ExpAPI = (() => {
  // Initialize Supabase client
  let supabase = null;

  // Promise that resolves once the Supabase client is ready.
  let _supabaseReadyResolve;
  const supabaseReady = new Promise((resolve) => { _supabaseReadyResolve = resolve; });

  const initSupabase = () => {
    if (!window.EXP_CONFIG?.SUPABASE?.URL || !window.EXP_CONFIG?.SUPABASE?.ANON_KEY) {
      console.error("Supabase configuration missing!");
      _supabaseReadyResolve(false);
      return;
    }
    if (window.supabase) {
      supabase = window.supabase.createClient(
        window.EXP_CONFIG.SUPABASE.URL,
        window.EXP_CONFIG.SUPABASE.ANON_KEY
      );
      _supabaseReadyResolve(true);
    } else {
      console.error("Supabase JS library not loaded!");
      _supabaseReadyResolve(false);
    }
  };

  // Initialize on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSupabase);
  } else {
    initSupabase();
  }

  // Helper for current user
  const getCurrentUser = () => {
    const userStr = localStorage.getItem("exp_current_user");
    return userStr ? JSON.parse(userStr) : null;
  };

  const setCurrentUser = (user) => {
    if (user) {
      localStorage.setItem("exp_current_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("exp_current_user");
    }
  };

  const refreshCurrentUser = async () => {
    const user = getCurrentUser();
    if (!user || user.type !== "supplier") {
      return { ok: false, data: null, error: "No user logged in" };
    }
    await supabaseReady;
    if (!supabase) {
      return { ok: false, data: null, error: "Supabase client not available" };
    }
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", user.id)
      .single();
    if (error) {
      return { ok: false, data: null, error: error.message };
    }
    const updatedUser = { type: "supplier", ...data };
    setCurrentUser(updatedUser);
    return { ok: true, data: updatedUser, error: null };
  };

  return {
    // =============================================
    // AUTH HELPERS
    // =============================================
    getCurrentUser,
    refreshCurrentUser,
    logout: () => {
      setCurrentUser(null);
      return { ok: true, data: null, error: null };
    },
    // =============================================
    // AUTH
    // =============================================
    supplierLogin: async (email, password) => {
      try {
        if (!supabase) {
          return { ok: false, data: null, error: "Supabase client not initialized" };
        }
        const { data, error } = await supabase
          .from("suppliers")
          .select("*")
          .eq("email", email)
          .single();

        // If no user found (error.code === 'PGRST116')
        if (error?.code === 'PGRST116' || !data) {
          return { ok: false, data: null, error: "No account found with this email. Please register first." };
        }
        
        if (error) {
          console.error("Login error:", error);
          return { ok: false, data: null, error: error.message || "An error occurred during login" };
        }
        
        // In production, use bcrypt.compare() here!
        if (data.password !== password) {
          return { ok: false, data: null, error: "Invalid email or password." };
        }

        // Only store non-sensitive user data (no password!) in localStorage
        const user = {
          type: "supplier",
          id: data.id,
          email: data.email,
          company_name: data.company_name,
          status: data.status
        };
        setCurrentUser(user);
        return { ok: true, data: user, error: null };
      } catch (err) {
        console.error("Login exception:", err);
        return { ok: false, data: null, error: err.message || "An unexpected error occurred" };
      }
    },

    supplierLogout: () => {
      setCurrentUser(null);
      return { ok: true, data: null, error: null };
    },

    adminLogout: () => {
      localStorage.removeItem('adminSession');
      localStorage.removeItem('success_academy_admin_bypass');
      return { ok: true, data: null, error: null };
    },

    supplierRegister: async (payload) => {
      try {
        if (!supabase) {
          return { ok: false, data: null, error: "Supabase client not initialized" };
        }
        
        // Check if email exists
        const { data: existing, error: checkError } = await supabase
          .from("suppliers")
          .select("id")
          .eq("email", payload.email)
          .single();

        // If checkError is "no rows found", that's okay - proceed
        if (existing) {
          return { ok: false, data: null, error: "Email already registered." };
        }

        // In production, hash password with bcrypt first!
        const insertData = {
          company_name: payload.companyName,
          contact_name: payload.contactName,
          email: payload.email,
          phone: payload.phone,
          password: payload.password,
          business_address: payload.location || null,
          status: "pending" // default to pending
        };
        
        // Try to add category/subcategory (columns might not exist yet)
        try {
          insertData.category = payload.category || null;
          insertData.subcategory = payload.subcategory || null;
        } catch (e) {
          console.log("Category/subcategory columns not yet available");
        }

        const { data, error } = await supabase
          .from("suppliers")
          .insert([insertData])
          .select()
          .single();

        // After inserting supplier, link category via supplier_categories
        if (!error && data && payload.category) {
          // Look up or create the category
          let { data: catRow } = await supabase
            .from("categories")
            .select("id")
            .eq("name", payload.category)
            .single();

          if (!catRow) {
            const { data: newCat } = await supabase
              .from("categories")
              .insert([{ name: payload.category }])
              .select()
              .single();
            catRow = newCat;
          }

          if (catRow) {
            await supabase
              .from("supplier_categories")
              .insert([{ supplier_id: data.id, category_id: catRow.id }]);
          }
        }

        if (error) {
          console.error("Registration error:", error);
          return { ok: false, data: null, error: error.message || "An error occurred during registration" };
        }

        const user = { type: "supplier", ...data };
        setCurrentUser(user);
        return { ok: true, data: user, error: null };
      } catch (err) {
        return { ok: false, data: null, error: err.message };
      }
    },

    staffLogin: async (email, password) => {
      try {
        // Simple demo login - in production use Supabase Auth!
        const { data, error } = await supabase
          .from("staff_users")
          .select("*")
          .eq("email", email)
          .single();

        if (error) return { ok: false, data: null, error: "Invalid email or password." };

        const user = { type: "staff", ...data };
        setCurrentUser(user);
        return { ok: true, data: user, error: null };
      } catch (err) {
        return { ok: false, data: null, error: err.message };
      }
    },

    startMs365Sso: () => {
      return Promise.resolve({ ok: false, data: null, error: "Microsoft 365 SSO not implemented yet." });
    },

    logout: async () => {
      setCurrentUser(null);
      return { ok: true, data: null, error: null };
    },

    currentUser: async () => {
      const user = getCurrentUser();
      return { ok: !!user, data: user, error: user ? null : "Not logged in." };
    },

    // =============================================
    // DASHBOARD
    // =============================================
    supplierSummary: async () => {
      try {
        const user = getCurrentUser();
        if (!user || user.type !== "supplier") {
          return { ok: false, data: null, error: "Not logged in as supplier." };
        }

        // Run all three independent queries in parallel
        const [
          { count: productCount,  error: prodError },
          { data: categories,     error: catError  },
          { count: documentCount, error: docError  }
        ] = await Promise.all([
          supabase.from("products").select("*", { count: "exact", head: true }).eq("supplier_id", user.id),
          supabase.from("supplier_categories").select("category_id").eq("supplier_id", user.id),
          supabase.from("documents").select("*", { count: "exact", head: true }).eq("supplier_id", user.id)
        ]);

        const firstError = prodError || catError || docError;
        if (firstError) return { ok: false, data: null, error: firstError.message };

        return {
          ok: true,
          data: {
            status:        user.status,
            productCount:  productCount         || 0,
            categoryCount: categories?.length   || 0,
            documentCount: documentCount        || 0
          },
          error: null
        };
      } catch (err) {
        return { ok: false, data: null, error: err.message };
      }
    },

    adminSummary: async () => {
      try {
        // Run all three independent queries in parallel
        const [
          { count: pendingCount,  error: pendingError  },
          { count: approvedCount, error: approvedError },
          { count: liveProductCount, error: prodError  }
        ] = await Promise.all([
          supabase.from("suppliers").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("suppliers").select("*", { count: "exact", head: true }).eq("status", "approved"),
          // Count products belonging to approved suppliers via a join filter
          supabase.from("products").select("*, suppliers!inner(status)", { count: "exact", head: true }).eq("suppliers.status", "approved")
        ]);

        const firstError = pendingError || approvedError || prodError;
        if (firstError) return { ok: false, data: null, error: firstError.message };

        return {
          ok: true,
          data: {
            pendingCount:     pendingCount     || 0,
            approvedCount:    approvedCount    || 0,
            liveProductCount: liveProductCount || 0,
            lastSync: new Date().toISOString()
          },
          error: null
        };
      } catch (err) {
        return { ok: false, data: null, error: err.message };
      }
    },

    // =============================================
    // PRODUCTS
    // =============================================
    listMyProducts: async () => {
      try {
        const user = getCurrentUser();
        if (!user || user.type !== "supplier") {
          return { ok: false, data: [], error: "Not logged in as supplier." };
        }

        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("supplier_id", user.id)
          .order("created_at", { ascending: false });

        if (error) return { ok: false, data: [], error: error.message };
        return { ok: true, data, error: null };
      } catch (err) {
        return { ok: false, data: [], error: err.message };
      }
    },

    listSupplierProducts: async (supplierId) => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("supplier_id", supplierId)
          .order("created_at", { ascending: false });

        if (error) return { ok: false, data: [], error: error.message };
        return { ok: true, data, error: null };
      } catch (err) {
        return { ok: false, data: [], error: err.message };
      }
    },

    uploadProductPhoto: async (file) => {
      try {
        const user = getCurrentUser();
        if (!user || user.type !== "supplier") {
          return { ok: false, data: null, error: "Not logged in as supplier." };
        }

        // First try to upload to Vercel Blob via API endpoint
        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/upload-product-photo', {
            method: 'POST',
            headers: {
              'x-supplier-id': user.id
            },
            body: formData
          });

          const result = await response.json();
          
          if (response.ok && result.ok && result.url) {
            return { ok: true, data: result.url, error: null };
          }
        } catch (blobErr) {
          console.log('[v0] Blob upload failed, trying fallback:', blobErr.message);
        }

        // Fallback: Convert to base64 and store locally with indexedDB
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const base64 = e.target.result;
            const photoId = `photo_${user.id}_${Date.now()}`;
            
            // Store in localStorage as fallback
            try {
              localStorage.setItem(photoId, base64);
              return resolve({ ok: true, data: base64, error: null });
            } catch (storageErr) {
              // If localStorage is full, return the base64 directly
              return resolve({ ok: true, data: base64, error: null });
            }
          };
          reader.onerror = () => {
            return resolve({ ok: false, data: null, error: 'Could not read file' });
          };
          reader.readAsDataURL(file);
        });
      } catch (err) {
        return { ok: false, data: null, error: err.message };
      }
    },

    createProduct: async (payload) => {
      try {
        const user = getCurrentUser();
        if (!user || user.type !== "supplier") {
          return { ok: false, data: null, error: "Not logged in as supplier." };
        }

        const insertData = {
          supplier_id: user.id,
          name: payload.name,
          category: payload.category,
          unit: payload.unit,
          price_per_item: payload.price_per_item,
          quantity_in_stock: payload.quantity_in_stock,
          total_cost: payload.total_cost,
          description: payload.description,
          photo_url: payload.photo_url
        };

        // Add subcategory only if it exists (to avoid 400 if DB doesn't have column yet)
        if (payload.subcategory) {
          insertData.subcategory = payload.subcategory;
        }

        const { data, error } = await supabase
          .from("products")
          .insert([insertData])
          .select()
          .single();

        if (error) return { ok: false, data: null, error: error.message };
        return { ok: true, data, error: null };
      } catch (err) {
        return { ok: false, data: null, error: err.message };
      }
    },

    updateProduct: async (id, payload) => {
      try {
        // Make a copy of payload and only include subcategory if it exists (to avoid 400 if DB doesn't have column yet)
        const updateData = { ...payload };
        if (!payload.subcategory) {
          delete updateData.subcategory;
        }

        const { data, error } = await supabase
          .from("products")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

        if (error) return { ok: false, data: null, error: error.message };
        return { ok: true, data, error: null };
      } catch (err) {
        return { ok: false, data: null, error: err.message };
      }
    },

    deleteProduct: async (id) => {
      try {
        const { error } = await supabase
          .from("products")
          .delete()
          .eq("id", id);

        if (error) return { ok: false, data: null, error: error.message };
        return { ok: true, data: null, error: null };
      } catch (err) {
        return { ok: false, data: null, error: err.message };
      }
    },

    // =============================================
    // CATEGORIES
    // =============================================
    listAllCategories: async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("name");

        if (error) return { ok: false, data: [], error: error.message };
        return { ok: true, data, error: null };
      } catch (err) {
        return { ok: false, data: [], error: err.message };
      }
    },

    listMyCategories: async () => {
      try {
        const user = getCurrentUser();
        if (!user || user.type !== "supplier") {
          return { ok: false, data: [], error: "Not logged in as supplier." };
        }

        const { data, error } = await supabase
          .from("supplier_categories")
          .select("categories(id, name)")
          .eq("supplier_id", user.id);

        if (error) return { ok: false, data: [], error: error.message };

        // Flatten the nested data
        const categories = data?.map(d => d.categories) || [];
        return { ok: true, data: categories, error: null };
      } catch (err) {
        return { ok: false, data: [], error: err.message };
      }
    },

    updateMyCategories: async (categoryNames) => {
      try {
        const user = getCurrentUser();
        if (!user || user.type !== "supplier") {
          return { ok: false, data: null, error: "Not logged in as supplier." };
        }

        // First, delete existing categories for this supplier
        await supabase.from("supplier_categories").delete().eq("supplier_id", user.id);

        if (categoryNames.length === 0) {
          return { ok: true, data: [], error: null };
        }

        // Get category IDs from names
        const { data: categories, error: catError } = await supabase
          .from("categories")
          .select("id, name")
          .in("name", categoryNames);

        if (catError) return { ok: false, data: null, error: catError.message };

        // Insert new supplier categories
        const inserts = categories.map(cat => ({
          supplier_id: user.id,
          category_id: cat.id
        }));

        const { error: insertError } = await supabase.from("supplier_categories").insert(inserts);

        if (insertError) return { ok: false, data: null, error: insertError.message };

        // Update current user in localStorage
        const updatedUser = { ...user, categories: categories.map(c => c.name) };
        setCurrentUser(updatedUser);

        return { ok: true, data: categories, error: null };
      } catch (err) {
        return { ok: false, data: null, error: err.message };
      }
    },

    updateMyProfile: async (profileData) => {
      try {
        const user = getCurrentUser();
        if (!user || user.type !== "supplier") {
          return { ok: false, data: null, error: "Not logged in as supplier." };
        }

        // Build the update data
        const updateData = {};
        if (profileData.companyName) updateData.company_name = profileData.companyName;
        if (profileData.contactName) updateData.contact_name = profileData.contactName;
        if (profileData.email) updateData.email = profileData.email;
        if (profileData.phone) updateData.phone = profileData.phone;
        if (profileData.businessRegNo) updateData.business_reg_no = profileData.businessRegNo;
        if (profileData.vatNo) updateData.vat_no = profileData.vatNo;
        if (profileData.businessAddress) updateData.business_address = profileData.businessAddress;
        if (profileData.about) updateData.about = profileData.about;
        if (profileData.password) updateData.password = profileData.password;
        
        // Try to add category/subcategory (columns might not exist yet)
        try {
          if (profileData.category !== undefined) updateData.category = profileData.category;
          if (profileData.subcategory !== undefined) updateData.subcategory = profileData.subcategory;
        } catch (e) {
          console.log("Category/subcategory columns not yet available");
        }

        const { data, error } = await supabase
          .from("suppliers")
          .update(updateData)
          .eq("id", user.id)
          .select()
          .single();

        if (error) return { ok: false, data: null, error: error.message };

        // Update current user in localStorage
        const updatedUser = { ...user, ...data };
        setCurrentUser(updatedUser);

        return { ok: true, data: data, error: null };
      } catch (err) {
        return { ok: false, data: null, error: err.message };
      }
    },

    // =============================================
    // DOCUMENTS
    // =============================================
    listMyDocuments: async () => {
      try {
        const user = getCurrentUser();
        if (!user || user.type !== "supplier") {
          return { ok: false, data: [], error: "Not logged in as supplier." };
        }

        const { data, error } = await supabase
          .from("documents")
          .select("*")
          .eq("supplier_id", user.id)
          .order("uploaded_at", { ascending: false });

        if (error) return { ok: false, data: [], error: error.message };
        return { ok: true, data, error: null };
      } catch (err) {
        return { ok: false, data: [], error: err.message };
      }
    },

    uploadDocument: async (formData) => {
      try {
        const user = getCurrentUser();
        if (!user || user.type !== "supplier") {
          return { ok: false, data: null, error: "Not logged in as supplier." };
        }

        const file = formData.get("file");
        if (!file) {
          return { ok: false, data: null, error: "No file provided." };
        }

        // Upload to Supabase Storage
        const fileExt = file.name.split(".").pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;

        const { data: storageData, error: storageError } = await supabase.storage
          .from("supplier-documents")
          .upload(filePath, file);

        if (storageError) return { ok: false, data: null, error: storageError.message };

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("supplier-documents")
          .getPublicUrl(filePath);

        // Insert document record
        const { data, error } = await supabase
          .from("documents")
          .insert([{
            supplier_id: user.id,
            name: file.name,
            type: file.type,
            size: file.size,
            file_path: filePath,
            file_url: publicUrl
          }])
          .select()
          .single();

        if (error) return { ok: false, data: null, error: error.message };
        return { ok: true, data, error: null };
      } catch (err) {
        return { ok: false, data: null, error: err.message };
      }
    },

    deleteDocument: async (id) => {
      try {
        // First get the file path
        const { data: doc, error: getError } = await supabase
          .from("documents")
          .select("file_path")
          .eq("id", id)
          .single();

        if (getError) return { ok: false, data: null, error: getError.message };

        // Delete from storage
        if (doc?.file_path) {
          await supabase.storage.from("supplier-documents").remove([doc.file_path]);
        }

        // Delete from database
        const { error } = await supabase
          .from("documents")
          .delete()
          .eq("id", id);

        if (error) return { ok: false, data: null, error: error.message };
        return { ok: true, data: null, error: null };
      } catch (err) {
        return { ok: false, data: null, error: err.message };
      }
    },

    // =============================================
    // ADMIN
    // =============================================
    listVendors: async (params = {}) => {
      try {
        let query = supabase.from("suppliers").select("*").order("created_at", { ascending: false });
        if (params.status) query = query.eq("status", params.status);
        const { data, error } = await query;
        if (error) return { ok: false, data: [], error: error.message };
        return { ok: true, data, error: null };
      } catch (err) {
        return { ok: false, data: [], error: err.message };
      }
    },

    getVendor: async (id) => {
      try {
        const [
          { data: supplier, error: supError },
          { data: products, error: prodError }
        ] = await Promise.all([
          supabase.from("suppliers").select("*").eq("id", id).single(),
          supabase.from("products").select("*").eq("supplier_id", id).order("created_at", { ascending: false })
        ]);

        if (supError) return { ok: false, data: null, error: "Supplier not found." };
        if (prodError) return { ok: false, data: null, error: prodError.message };

        return { ok: true, data: { ...supplier, products: products || [] }, error: null };
      } catch (err) {
        return { ok: false, data: null, error: err.message };
      }
    },

    listApprovalQueue: async () => {
      try {
        const { data, error } = await supabase
          .from("suppliers")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false });
        if (error) return { ok: false, data: [], error: error.message };
        return { ok: true, data, error: null };
      } catch (err) {
        return { ok: false, data: [], error: err.message };
      }
    },

    approveVendor: async (id, note) => {
      try {
        const { data, error } = await supabase
          .from("suppliers")
          .update({
            status: "approved",
            approval_note: note,
            approved_at: new Date().toISOString()
          })
          .eq("id", id)
          .select()
          .single();

        if (error) return { ok: false, data: null, error: error.message };
        return { ok: true, data, error: null };
      } catch (err) {
        return { ok: false, data: null, error: err.message };
      }
    },

    rejectVendor: async (id, reason) => {
      try {
        const { data, error } = await supabase
          .from("suppliers")
          .update({
            status: "rejected",
            rejection_reason: reason,
            rejected_at: new Date().toISOString()
          })
          .eq("id", id)
          .select()
          .single();

        if (error) return { ok: false, data: null, error: error.message };
        return { ok: true, data, error: null };
      } catch (err) {
        return { ok: false, data: null, error: err.message };
      }
    },

    listAllSupplies: async (params = {}) => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*, suppliers!inner(*)")
          .order("created_at", { ascending: false });

        if (error) return { ok: false, data: [], error: error.message };

        // Flatten the data
        const supplies = data?.map(p => ({
          ...p,
          supplier: p.suppliers
        })) || [];

        return { ok: true, data: supplies, error: null };
      } catch (err) {
        return { ok: false, data: [], error: err.message };
      }
    },

    triggerMarketplaceSync: async () => {
      // For Supabase, this is just a no-op since marketplace reads directly from DB
      return { ok: true, data: { syncedAt: new Date().toISOString() }, error: null };
    },

    // =============================================
    // MARKETPLACE
    // =============================================
    listApprovedSuppliers: async () => {
      try {
        // Fetch suppliers and ALL products in parallel — no sequential dependency
        const [
          { data: suppliers, error: supError },
          { data: allProducts, error: prodError }
        ] = await Promise.all([
          supabase.from("suppliers").select("*").eq("status", "approved").order("created_at", { ascending: false }),
          supabase.from("products").select("*").order("created_at", { ascending: false })
        ]);

        if (supError) return { ok: false, data: [], error: supError.message };
        if (!suppliers || suppliers.length === 0) return { ok: true, data: [], error: null };

        // Build a set of approved supplier IDs for fast lookup
        const approvedIds = new Set(suppliers.map(s => s.id));
        const products = (prodError ? [] : (allProducts || [])).filter(p => approvedIds.has(p.supplier_id));

        // Group products by supplier
        const productsBySupplier = products.reduce((acc, p) => {
          (acc[p.supplier_id] = acc[p.supplier_id] || []).push(p);
          return acc;
        }, {});

        const suppliersWithProducts = suppliers.map(s => ({
          ...s,
          products:     productsBySupplier[s.id] || [],
          productCount: (productsBySupplier[s.id] || []).length
        }));

        return { ok: true, data: suppliersWithProducts, error: null };
      } catch (err) {
        return { ok: false, data: [], error: err.message };
      }
    },

    searchSuppliers: async (query, filters = {}) => {
      try {
        let dbQuery = supabase.from("suppliers").select("*").eq("status", "approved");

        if (filters.category) {
          // First get suppliers with this category
          const { data: supplierIds, error: catError } = await supabase
            .from("supplier_categories")
            .select("supplier_id, categories(name)")
            .eq("categories.name", filters.category);

          if (catError) return { ok: false, data: [], error: catError.message };

          if (supplierIds.length === 0) {
            return { ok: true, data: [], error: null };
          }

          dbQuery = dbQuery.in("id", supplierIds.map(s => s.supplier_id));
        }

        const { data: suppliers, error: supError } = await dbQuery.order("created_at", { ascending: false });
        if (supError) return { ok: false, data: [], error: supError.message };

        // Filter by search query
        let filteredSuppliers = suppliers;
        if (query) {
          const q = query.toLowerCase();
          filteredSuppliers = suppliers.filter(s =>
            s.company_name.toLowerCase().includes(q)
          );
        }

        // Get product counts for all suppliers
        const supplierIds = filteredSuppliers.map(s => s.id);
        let productCounts = {};
        if (supplierIds.length > 0) {
          const { data: products, error: prodError } = await supabase
            .from("products")
            .select("supplier_id")
            .in("supplier_id", supplierIds);

          if (!prodError) {
            productCounts = products.reduce((acc, p) => {
              acc[p.supplier_id] = (acc[p.supplier_id] || 0) + 1;
              return acc;
            }, {});
          }
        }

        // Add product counts
        const suppliersWithCounts = filteredSuppliers.map(s => ({
          ...s,
          productCount: productCounts[s.id] || 0
        }));

        return { ok: true, data: suppliersWithCounts, error: null };
      } catch (err) {
        return { ok: false, data: [], error: err.message };
      }
    },

    listMarketplaceCategories: async () => {
      try {
        // Single join query: get categories used by approved suppliers directly
        const { data: catData, error: catError } = await supabase
          .from("supplier_categories")
          .select("categories(*), suppliers!inner(status)")
          .eq("suppliers.status", "approved");

        if (catError) return { ok: false, data: [], error: catError.message };

        // Extract unique categories
        const uniqueCats = [];
        const seen = new Set();
        (catData || []).forEach(item => {
          if (item.categories && !seen.has(item.categories.id)) {
            seen.add(item.categories.id);
            uniqueCats.push(item.categories);
          }
        });

        uniqueCats.sort((a, b) => a.name.localeCompare(b.name));
        return { ok: true, data: uniqueCats, error: null };
      } catch (err) {
        return { ok: false, data: [], error: err.message };
      }
    },

    getSupplierProfile: async (id) => {
      try {
        const [
          { data: supplier, error: supError },
          { data: products }
        ] = await Promise.all([
          supabase.from("suppliers").select("*").eq("id", id).single(),
          supabase.from("products").select("*").eq("supplier_id", id).order("created_at", { ascending: false })
        ]);

        if (supError || !supplier) return { ok: false, data: null, error: "Supplier not found." };

        return { ok: true, data: { ...supplier, products: products || [] }, error: null };
      } catch (err) {
        return { ok: false, data: null, error: err.message };
      }
    },

    // =============================================
    // VENDOR DETAIL HELPERS (used by admin portal)
    // =============================================
    listVendorSupplies: async (vendorId) => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("supplier_id", vendorId)
          .order("created_at", { ascending: false });
        if (error) return { ok: false, data: [], error: error.message };
        return { ok: true, data: data || [], error: null };
      } catch (err) {
        return { ok: false, data: [], error: err.message };
      }
    },

    listVendorCategories: async (vendorId) => {
      try {
        const { data, error } = await supabase
          .from("supplier_categories")
          .select("categories(id, name)")
          .eq("supplier_id", vendorId);
        if (error) return { ok: false, data: [], error: error.message };
        const cats = (data || []).map(d => d.categories).filter(Boolean);
        return { ok: true, data: cats, error: null };
      } catch (err) {
        return { ok: false, data: [], error: err.message };
      }
    },

    contactSupplier: async (id, payload) => {
      try {
        const user = getCurrentUser();
        const { data, error } = await supabase
          .from("supplier_contacts")
          .insert([{
            supplier_id: id,
            staff_id: user?.type === "staff" ? user.id : null,
            subject: payload.subject,
            message: payload.message
          }])
          .select()
          .single();

        if (error) return { ok: false, data: null, error: error.message };
        return { ok: true, data, error: null };
      } catch (err) {
        return { ok: false, data: null, error: err.message };
      }
    },

    isBackendReady: () => !!window.EXP_CONFIG?.SUPABASE?.URL && !!window.EXP_CONFIG?.SUPABASE?.ANON_KEY
  };
})();
