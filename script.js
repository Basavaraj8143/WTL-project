// IndexedDB Database Name and Version
const DB_NAME = 'NotesDB';
const DB_VERSION = 1;
const STORE_NAME = 'notes';

let db;
let editingNoteId = null;

// Initialize IndexedDB
function initDB() {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Create object store if it doesn't exist
    request.onupgradeneeded = function(event) {
        db = event.target.result;
        
        // Create object store with auto-incrementing key
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            const objectStore = db.createObjectStore(STORE_NAME, { 
                keyPath: 'id', 
                autoIncrement: true 
            });
            
            // Create index for searching by title
            objectStore.createIndex('title', 'title', { unique: false });
        }
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        console.log('Database initialized successfully');
        loadNotes(); // Load notes when DB is ready
    };

    request.onerror = function(event) {
        console.error('Database error:', event.target.error);
    };
}

// Add or Update Note
function saveNote(title, content) {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);

    const note = {
        title: title,
        content: content,
        timestamp: new Date().toISOString()
    };

    let request;
    
    // If editing, include the id
    if (editingNoteId !== null) {
        note.id = editingNoteId;
        request = objectStore.put(note); // Update existing note
    } else {
        request = objectStore.add(note); // Add new note
    }

    request.onsuccess = function() {
        console.log('Note saved successfully');
        loadNotes();
        clearForm();
    };

    request.onerror = function(event) {
        console.error('Error saving note:', event.target.error);
    };
}

// Load All Notes
function loadNotes(searchQuery = '') {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        let notes = event.target.result;
        
        // Filter notes by search query
        if (searchQuery) {
            notes = notes.filter(note => 
                note.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        // Sort notes by most recent first
        notes.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

        displayNotes(notes);
    };

    request.onerror = function(event) {
        console.error('Error loading notes:', event.target.error);
    };
}

// Display Notes in UI
function displayNotes(notes) {
    const container = document.getElementById('notesContainer');
    container.innerHTML = '';

    if (notes.length === 0) {
        container.innerHTML = '<div class="no-notes">No notes found. Create your first note!</div>';
        return;
    }

    notes.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.className = 'note-card';
        noteCard.innerHTML = `
            <h3>${note.title}</h3>
            <div class="note-meta">${formatTimestamp(note.timestamp)}</div>
            <p>${note.content}</p>
            <div class="note-actions">
                <button class="edit-btn" onclick="editNote(${note.id})">Edit</button>
                <button class="delete-btn" onclick="deleteNote(${note.id})">Delete</button>
            </div>
        `;
        container.appendChild(noteCard);
    });
}

// Format stored ISO timestamp into a readable date/time
function formatTimestamp(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date)) return '';
    return date.toLocaleString();
}

// Edit Note
function editNote(id) {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.get(id);

    request.onsuccess = function(event) {
        const note = event.target.result;
        
        // Fill form with note data
        document.getElementById('noteTitle').value = note.title;
        document.getElementById('noteContent').value = note.content;
        document.getElementById('saveBtn').textContent = 'Update Note';
        document.getElementById('cancelBtn').style.display = 'inline-block';
        
        editingNoteId = id;
    };
}

// Delete Note
function deleteNote(id) {
    if (!confirm('Are you sure you want to delete this note?')) {
        return;
    }

    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.delete(id);

    request.onsuccess = function() {
        console.log('Note deleted successfully');
        loadNotes();
    };

    request.onerror = function(event) {
        console.error('Error deleting note:', event.target.error);
    };
}

// Clear Form
function clearForm() {
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    document.getElementById('saveBtn').textContent = 'Save Note';
    document.getElementById('cancelBtn').style.display = 'none';
    editingNoteId = null;
}

// Event Listeners
document.getElementById('saveBtn').addEventListener('click', function() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();

    if (!title || !content) {
        alert('Please enter both title and content');
        return;
    }

    saveNote(title, content);
});

document.getElementById('cancelBtn').addEventListener('click', clearForm);

document.getElementById('searchInput').addEventListener('input', function(e) {
    loadNotes(e.target.value);
});

// Initialize database when page loads
initDB();