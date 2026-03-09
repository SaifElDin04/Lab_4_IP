// MODEL
class Store {
    constructor() {
        try {
            this.items = JSON.parse(localStorage.getItem('vibe_tasks_final')) || [];
        } catch (e) {
            this.items = [];
        }
        this.onChange = null;
    }

    bind(callback) { this.onChange = callback; }

    save() { 
        localStorage.setItem('vibe_tasks_final', JSON.stringify(this.items)); 
        this.onChange(this.items); 
    }

    add(text) { 
        this.items.push({ id: Date.now().toString(), text, done: false, time: Date.now() }); 
        this.save(); 
    }

    remove(id) { this.items = this.items.filter(i => i.id !== id); this.save(); }

    flip(id) { let item = this.items.find(i => i.id === id); if (item) { item.done = !item.done; this.save(); } }

    edit(id, text) { let item = this.items.find(i => i.id === id); if (item) { item.text = text; this.save(); } }

    get(filter, sort) {
        let out = [...this.items];
        if (filter === 'pending') out = out.filter(i => !i.done);
        if (filter === 'finished') out = out.filter(i => i.done);

        out.sort((a, b) => {
            if (sort === 'recent') return b.time - a.time;
            if (sort === 'oldest') return a.time - b.time;
            if (sort === 'a-z') return a.text.localeCompare(b.text);
            if (sort === 'z-a') return b.text.localeCompare(a.text);
        });
        return out;
    }
}

// VIEW
class UI {
    constructor() {
        this.list = document.getElementById('list');
        this.input = document.getElementById('input');
        this.btnSubmit = document.getElementById('submit');
        this.radios = document.querySelectorAll('input[name="status"]');
        this.select = document.getElementById('sort');

        this.mode = 'every';
        this.order = 'recent';
        this.editId = null;
    }

    icon(name) { return `<span class="material-symbols-rounded">${name}</span>`; }

    render(data) {
        this.list.innerHTML = '';
        
        if (data.length === 0) {
            this.list.innerHTML = `<p class="empty-text">No tasks here yet. Add one above!</p>`;
            return;
        }

        data.forEach(item => {
            let li = document.createElement('li');
            li.className = `row ${item.done ? 'done' : ''}`;
            li.id = item.id;

            let check = document.createElement('button');
            check.className = 'btn toggle';
            check.innerHTML = item.done ? this.icon('check_circle') : this.icon('radio_button_unchecked');

            let txtDiv = document.createElement('div');
            txtDiv.className = 'text';

            if (this.editId === item.id) {
                let box = document.createElement('input');
                box.className = 'edit-box';
                box.value = item.text;
                txtDiv.appendChild(box);
            } else {
                let span = document.createElement('span');
                span.className = 'label';
                span.textContent = item.text;

                let time = document.createElement('span');
                time.className = 'time';
                time.textContent = new Date(item.time).toLocaleString();
                
                txtDiv.append(span, time);
            }

            let actions = document.createElement('div');
            if (this.editId === item.id) {
                let save = document.createElement('button');
                save.className = 'btn save';
                save.innerHTML = this.icon('save');
                actions.appendChild(save);
            } else {
                let editBtn = document.createElement('button');
                editBtn.className = 'btn edit';
                editBtn.innerHTML = this.icon('edit_note');

                let del = document.createElement('button');
                del.className = 'btn del';
                del.innerHTML = this.icon('delete');

                actions.append(editBtn, del);
            }

            li.append(check, txtDiv, actions);
            this.list.appendChild(li);

            if (this.editId === item.id) li.querySelector('.edit-box').focus();
        });
    }

    onAdd(callback) {
        const triggerSave = () => {
            let val = this.input.value.trim();
            if (val) { callback(val); this.input.value = ''; }
        };

        this.btnSubmit.addEventListener('click', triggerSave);
        
        this.input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault(); 
                triggerSave();
            }
        });
    }

    onAct(toggleCb, deleteCb, editStartCb, editSaveCb) {
        this.list.addEventListener('click', e => {
            let row = e.target.closest('.row');
            if (!row) return;

            if (e.target.closest('.toggle')) toggleCb(row.id);
            else if (e.target.closest('.del')) {
                row.classList.add('removing');
                setTimeout(() => deleteCb(row.id), 300);
            }
            else if (e.target.closest('.edit')) editStartCb(row.id);
            else if (e.target.closest('.save')) {
                editSaveCb(row.id, row.querySelector('.edit-box').value.trim());
            }
        });

        this.list.addEventListener('keydown', e => {
            if (e.key === 'Enter' && e.target.classList.contains('edit-box')) {
                editSaveCb(e.target.closest('.row').id, e.target.value.trim());
            }
        });
    }

    onTool(callback) {
        this.radios.forEach(r => r.addEventListener('change', e => { this.mode = e.target.value; callback(); }));
        this.select.addEventListener('change', e => { this.order = e.target.value; callback(); });
    }
}

// CONTROLLER
class TaskManager {
    constructor(store, ui) {
        this.store = store;
        this.ui = ui;

        this.store.bind(() => this.refresh());
        
        this.ui.onAdd(txt => this.store.add(txt));
        
        this.ui.onAct(
            id => this.store.flip(id),
            id => this.store.remove(id),
            id => { this.ui.editId = id; this.refresh(); },
            (id, txt) => { if (txt) this.store.edit(id, txt); this.ui.editId = null; this.refresh(); }
        );
        
        this.ui.onTool(() => this.refresh());

        this.refresh();
    }

    refresh() {
        this.ui.render(this.store.get(this.ui.mode, this.ui.order));
    }
}

const app = new TaskManager(new Store(), new UI());