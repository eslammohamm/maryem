    const STORAGE_KEY = 'maryam_daily_tasks_v1';

    const DEFAULT_TASKS = [
      { id: Date.now() + 1, title: 'مراجعة خطة اليوم وتحديد أهم 3 أولويات', category: 'عمل', priority: 'high', time: '09:00', completed: true },
      { id: Date.now() + 2, title: 'إنهاء العرض التقديمي وإرساله للمراجعة', category: 'عمل', priority: 'high', time: '11:30', completed: false },
      { id: Date.now() + 3, title: 'قراءة 20 صفحة في مجال التطوير المهني', category: 'دراسة', priority: 'medium', time: '16:00', completed: false },
      { id: Date.now() + 4, title: 'المشي لمدة 30 دقيقة وشرب 2 لتر ماء', category: 'صحة', priority: 'low', time: '18:30', completed: false }
    ];

    const TEMPLATES = {
      morning: [
        { title: 'شرب كوب ماء وتمرين تمدد لمدة 10 دقائق', category: 'صحة', priority: 'medium', time: '07:30' },
        { title: 'تحديد أهم 3 أهداف لليوم قبل فتح الهاتف', category: 'شخصي', priority: 'high', time: '08:00' },
        { title: 'مراجعة الرسائل العاجلة والرد عليها', category: 'عمل', priority: 'medium', time: '08:45' }
      ],
      work: [
        { title: 'جلسة عمل عميق لمدة 90 دقيقة بدون مقاطعة', category: 'عمل', priority: 'high', time: '10:00' },
        { title: 'متابعة حالة المشاريع الجارية مع الفريق', category: 'عمل', priority: 'medium', time: '13:00' },
        { title: 'تجهيز قائمة مهام الغد قبل انتهاء الدوام', category: 'عمل', priority: 'low', time: '16:45' }
      ],
      study: [
        { title: 'مذاكرة درس جديد وتلخيص أهم النقاط', category: 'دراسة', priority: 'high', time: '17:00' },
        { title: 'تطبيق عملي أو حل تدريبات لمدة 45 دقيقة', category: 'دراسة', priority: 'high', time: '18:15' },
        { title: 'مراجعة سريعة لملخص اليوم قبل النوم', category: 'دراسة', priority: 'low', time: '21:30' }
      ]
    };

    const PRIORITY_RANK = { high: 1, medium: 2, low: 3 };
    const PRIORITY_LABEL = { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };

    let tasks = loadTasks();
    let statusFilter = 'all';
    let categoryFilter = 'all';
    let searchQuery = '';
    let lastDeleted = null;
    let toastTimer = null;
    let currentSpotlightId = null;

    // DOM Elements
    const taskListEl = document.getElementById('taskList');
    const taskForm = document.getElementById('taskForm');
    const taskTitleInput = document.getElementById('taskTitle');
    const taskCategoryInput = document.getElementById('taskCategory');
    const taskPriorityInput = document.getElementById('taskPriority');
    const taskTimeInput = document.getElementById('taskTime');
    const categoryFilterEl = document.getElementById('categoryFilter');
    const searchInputEl = document.getElementById('searchInput');
    const tasksSummaryText = document.getElementById('tasksSummaryText');
    const clearCompletedBtn = document.getElementById('clearCompletedBtn');

    const progressRing = document.getElementById('progressRing');
    const progressPercent = document.getElementById('progressPercent');
    const completedCount = document.getElementById('completedCount');
    const remainingCount = document.getElementById('remainingCount');
    const spotlightTitle = document.getElementById('spotlightTitle');
    const spotlightMeta = document.getElementById('spotlightMeta');
    const completeSpotlightBtn = document.getElementById('completeSpotlightBtn');

    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    const closeModalBtn = document.getElementById('closeModalBtn');

    const toastEl = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const undoBtn = document.getElementById('undoBtn');

    // Date & Year
    document.getElementById('year').textContent = new Date().getFullYear();
    document.getElementById('todayDate').textContent = new Intl.DateTimeFormat('ar-EG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());

    // Mobile Menu
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    menuToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => navLinks.classList.remove('open'));
    });

    function loadTasks() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_TASKS;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : DEFAULT_TASKS;
      } catch {
        return DEFAULT_TASKS;
      }
    }

    function saveTasks() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }

    function escapeHTML(str) {
      return str.replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[m]));
    }

    function showToast(msg, canUndo = false) {
      toastMessage.textContent = msg;
      undoBtn.style.display = canUndo ? 'inline-block' : 'none';
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toastEl.classList.remove('show');
        lastDeleted = null;
      }, 5000);
    }

    function updateSummary() {
      const total = tasks.length;
      const done = tasks.filter(t => t.completed).length;
      const remaining = total - done;
      const percent = total === 0 ? 0 : Math.round((done / total) * 100);

      completedCount.textContent = done;
      remainingCount.textContent = remaining;
      progressPercent.textContent = `${percent}%`;
      tasksSummaryText.textContent = `إجمالي المهام: ${total} • المكتمل: ${done} • المتبقي: ${remaining}`;

      const circumference = 2 * Math.PI * 42;
      const offset = circumference - (percent / 100) * circumference;
      progressRing.style.strokeDashoffset = offset;

      const nextTask = tasks
        .filter(t => !t.completed)
        .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])[0];

      if (nextTask) {
        currentSpotlightId = nextTask.id;
        spotlightTitle.textContent = nextTask.title;
        spotlightMeta.textContent = `أولوية ${PRIORITY_LABEL[nextTask.priority]} • ${nextTask.time || 'اليوم'}`;
        completeSpotlightBtn.style.display = 'inline-flex';
      } else {
        currentSpotlightId = null;
        spotlightTitle.textContent = 'كل مهامك اليوم مكتملة، عمل رائع!';
        spotlightMeta.textContent = '100% إنجاز';
        completeSpotlightBtn.style.display = 'none';
      }
    }

    function renderTasks() {
      const filtered = tasks.filter(task => {
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' && !task.completed) ||
          (statusFilter === 'completed' && task.completed);
        const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;
        const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesCategory && matchesSearch;
      });

      if (filtered.length === 0) {
        taskListEl.innerHTML = `
          <div class="empty-state">
            لا توجد مهام مطابقة حالياً. أضف مهمة جديدة أو جرّب أحد القوالب الجاهزة بالأعلى.
          </div>
        `;
      } else {
        taskListEl.innerHTML = filtered.map(task => `
          <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <div class="task-main">
              <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} aria-label="إنجاز المهمة" />
              <div class="task-info">
                <div class="task-title">${escapeHTML(task.title)}</div>
                <div class="task-badges">
                  <span class="badge badge-cat">${escapeHTML(task.category)}</span>
                  <span class="badge badge-${task.priority}">أولوية ${PRIORITY_LABEL[task.priority]}</span>
                  ${task.time ? `<span class="badge-time">⏰ ${escapeHTML(task.time)}</span>` : ''}
                </div>
              </div>
            </div>
            <div class="task-actions">
              <button type="button" class="icon-btn edit-btn" title="تعديل" aria-label="تعديل المهمة">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
              <button type="button" class="icon-btn delete delete-btn" title="حذف" aria-label="حذف المهمة">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              </button>
            </div>
          </div>
        `).join('');
      }

      updateSummary();
    }

    // Add Task
    taskForm.addEventListener('submit', e => {
      e.preventDefault();
      const title = taskTitleInput.value.trim();
      if (!title) return;

      tasks.unshift({
        id: Date.now(),
        title,
        category: taskCategoryInput.value,
        priority: taskPriorityInput.value,
        time: taskTimeInput.value,
        completed: false
      });

      saveTasks();
      renderTasks();
      taskTitleInput.value = '';
      showToast('تمت إضافة المهمة بنجاح');
    });

    // Task List Actions (Toggle, Edit, Delete)
    taskListEl.addEventListener('click', e => {
      const item = e.target.closest('.task-item');
      if (!item) return;
      const id = Number(item.dataset.id);

      if (e.target.classList.contains('task-checkbox')) {
        const task = tasks.find(t => t.id === id);
        if (task) {
          task.completed = e.target.checked;
          saveTasks();
          renderTasks();
        }
        return;
      }

      if (e.target.closest('.delete-btn')) {
        const index = tasks.findIndex(t => t.id === id);
        if (index !== -1) {
          lastDeleted = { task: tasks[index], index };
          tasks.splice(index, 1);
          saveTasks();
          renderTasks();
          showToast('تم حذف المهمة', true);
        }
        return;
      }

      if (e.target.closest('.edit-btn')) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        document.getElementById('editId').value = task.id;
        document.getElementById('editTitle').value = task.title;
        document.getElementById('editCategory').value = task.category;
        document.getElementById('editPriority').value = task.priority;
        document.getElementById('editTime').value = task.time || '';
        editModal.classList.add('open');
      }
    });

    // Undo Delete
    undoBtn.addEventListener('click', () => {
      if (!lastDeleted) return;
      tasks.splice(lastDeleted.index, 0, lastDeleted.task);
      lastDeleted = null;
      saveTasks();
      renderTasks();
      toastEl.classList.remove('show');
    });

    // Spotlight Complete
    completeSpotlightBtn.addEventListener('click', () => {
      if (!currentSpotlightId) return;
      const task = tasks.find(t => t.id === currentSpotlightId);
      if (task) {
        task.completed = true;
        saveTasks();
        renderTasks();
        showToast('أحسنت! تم إنجاز المهمة');
      }
    });

    // Edit Modal Save & Close
    editForm.addEventListener('submit', e => {
      e.preventDefault();
      const id = Number(document.getElementById('editId').value);
      const task = tasks.find(t => t.id === id);
      if (task) {
        task.title = document.getElementById('editTitle').value.trim();
        task.category = document.getElementById('editCategory').value;
        task.priority = document.getElementById('editPriority').value;
        task.time = document.getElementById('editTime').value;
        saveTasks();
        renderTasks();
        showToast('تم حفظ التعديلات');
      }
      editModal.classList.remove('open');
    });

    closeModalBtn.addEventListener('click', () => editModal.classList.remove('open'));
    editModal.addEventListener('click', e => {
      if (e.target === editModal) editModal.classList.remove('open');
    });

    // Filters
    document.getElementById('statusFilters').addEventListener('click', e => {
      const btn = e.target.closest('.pill');
      if (!btn) return;
      document.querySelectorAll('#statusFilters .pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      statusFilter = btn.dataset.status;
      renderTasks();
    });

    categoryFilterEl.addEventListener('change', e => {
      categoryFilter = e.target.value;
      renderTasks();
    });

    searchInputEl.addEventListener('input', e => {
      searchQuery = e.target.value;
      renderTasks();
    });

    // Clear Completed
    clearCompletedBtn.addEventListener('click', () => {
      const before = tasks.length;
      tasks = tasks.filter(t => !t.completed);
      if (tasks.length === before) {
        showToast('لا توجد مهام مكتملة لحذفها');
        return;
      }
      saveTasks();
      renderTasks();
      showToast('تم حذف المهام المكتملة');
    });

    // Templates
    document.querySelectorAll('.template-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const list = TEMPLATES[btn.dataset.template] || [];
        let added = 0;
        list.forEach((tpl, idx) => {
          const exists = tasks.some(t => t.title === tpl.title);
          if (!exists) {
            tasks.unshift({
              id: Date.now() + idx + Math.floor(Math.random() * 1000),
              ...tpl,
              completed: false
            });
            added++;
          }
        });
        saveTasks();
        renderTasks();
        showToast(added > 0 ? `تمت إضافة ${added} مهام من القالب` : 'مهام هذا القالب موجودة بالفعل');
      });
    });

    // Contact Form
    document.getElementById('contactForm').addEventListener('submit', e => {
      e.preventDefault();
      e.target.reset();
      showToast('تم استلام رسالتك بنجاح، شكراً لتواصلك!');
    });

    // Initial Render
    renderTasks();
