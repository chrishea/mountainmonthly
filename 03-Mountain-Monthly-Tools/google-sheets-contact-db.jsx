import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Plus, Edit2, Trash2, X, Save, Database } from 'lucide-react';

export default function GoogleSheetsContactDB() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterField, setFilterField] = useState('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', notes: '' });
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [sheetId, setSheetId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Load configuration from localStorage
  useEffect(() => {
    const savedSheetId = localStorage.getItem('sheetsContactDB_sheetId');
    const savedApiKey = localStorage.getItem('sheetsContactDB_apiKey');
    if (savedSheetId && savedApiKey) {
      setSheetId(savedSheetId);
      setApiKey(savedApiKey);
      setIsConfigured(true);
    }
  }, []);

  // Load data when configured
  useEffect(() => {
    if (isConfigured) {
      loadContacts();
    }
  }, [isConfigured]);

  const saveConfiguration = () => {
    if (!sheetId || !apiKey) {
      setStatusMessage('Please enter both Sheet ID and API Key');
      return;
    }
    localStorage.setItem('sheetsContactDB_sheetId', sheetId);
    localStorage.setItem('sheetsContactDB_apiKey', apiKey);
    setIsConfigured(true);
    setStatusMessage('Configuration saved! Loading contacts...');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const resetConfiguration = () => {
    localStorage.removeItem('sheetsContactDB_sheetId');
    localStorage.removeItem('sheetsContactDB_apiKey');
    setSheetId('');
    setApiKey('');
    setIsConfigured(false);
    setContacts([]);
  };

  const loadContacts = async () => {
    setLoading(true);
    setStatusMessage('Loading contacts from Google Sheets...');
    
    try {
      const range = 'Sheet1!A2:C'; // Starting from row 2 (assuming headers in row 1)
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error) {
        setStatusMessage(`Error: ${data.error.message}`);
        setLoading(false);
        return;
      }
      
      const loadedContacts = (data.values || []).map((row, index) => ({
        rowIndex: index + 2, // Actual row number in sheet
        name: row[0] || '',
        email: row[1] || '',
        notes: row[2] || ''
      }));
      
      setContacts(loadedContacts);
      setStatusMessage(`Loaded ${loadedContacts.length} contacts`);
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      setStatusMessage(`Error loading contacts: ${error.message}`);
    }
    
    setLoading(false);
  };

  const appendToSheet = async (contact) => {
    setLoading(true);
    setStatusMessage('Adding contact to Google Sheets...');
    
    try {
      const range = 'Sheet1!A:C';
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [[contact.name, contact.email, contact.notes]]
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        setStatusMessage(`Error: ${data.error.message}`);
        setLoading(false);
        return;
      }
      
      setStatusMessage('Contact added successfully!');
      setTimeout(() => setStatusMessage(''), 3000);
      await loadContacts(); // Reload to get updated data
    } catch (error) {
      setStatusMessage(`Error adding contact: ${error.message}`);
    }
    
    setLoading(false);
  };

  const updateInSheet = async (rowIndex, contact) => {
    setLoading(true);
    setStatusMessage('Updating contact in Google Sheets...');
    
    try {
      const range = `Sheet1!A${rowIndex}:C${rowIndex}`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=USER_ENTERED&key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [[contact.name, contact.email, contact.notes]]
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        setStatusMessage(`Error: ${data.error.message}`);
        setLoading(false);
        return;
      }
      
      setStatusMessage('Contact updated successfully!');
      setTimeout(() => setStatusMessage(''), 3000);
      await loadContacts();
    } catch (error) {
      setStatusMessage(`Error updating contact: ${error.message}`);
    }
    
    setLoading(false);
  };

  const deleteFromSheet = async (rowIndex) => {
    setStatusMessage('Note: To delete, you need to use the Sheets API with OAuth. For now, manually delete the row in Google Sheets and refresh.');
  };

  const handleAdd = async () => {
    if (!formData.name && !formData.email) return;
    await appendToSheet(formData);
    setFormData({ name: '', email: '', notes: '' });
    setIsAdding(false);
  };

  const handleEdit = (contact, index) => {
    setEditingIndex(index);
    setFormData({ name: contact.name, email: contact.email, notes: contact.notes });
  };

  const handleUpdate = async () => {
    const contact = contacts[editingIndex];
    await updateInSheet(contact.rowIndex, formData);
    setEditingIndex(null);
    setFormData({ name: '', email: '', notes: '' });
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredContacts = contacts
    .filter(c => {
      const search = searchTerm.toLowerCase();
      if (filterField === 'all') {
        return c.name.toLowerCase().includes(search) ||
               c.email.toLowerCase().includes(search) ||
               c.notes.toLowerCase().includes(search);
      } else {
        return c[filterField].toLowerCase().includes(search);
      }
    })
    .sort((a, b) => {
      const aVal = (a[sortField] || '').toLowerCase();
      const bVal = (b[sortField] || '').toLowerCase();
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Configuration Screen
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-800">Google Sheets Contact Database</h1>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-blue-900 mb-2">Setup Instructions:</h2>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Create a Google Sheet with headers in row 1: Name, Email, Notes</li>
              <li>Get your Sheet ID from the URL: docs.google.com/spreadsheets/d/<strong>SHEET_ID</strong>/edit</li>
              <li>Create a Google Cloud API Key with Sheets API enabled</li>
              <li>Make your sheet publicly readable (Share → Anyone with link can view)</li>
            </ol>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Google Sheet ID
              </label>
              <input
                type="text"
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Google API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Your Google Cloud API Key"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {statusMessage && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                {statusMessage}
              </div>
            )}

            <button
              onClick={saveConfiguration}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Connect to Google Sheets
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Application
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Contact Database</h1>
                <p className="text-sm text-slate-600">Synced with Google Sheets</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-600">
                {contacts.length} contacts
              </div>
              <button
                onClick={resetConfiguration}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Change Sheet
              </button>
            </div>
          </div>

          {statusMessage && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              {statusMessage}
            </div>
          )}

          {/* Search and Filter */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Fields</option>
              <option value="name">Name Only</option>
              <option value="email">Email Only</option>
              <option value="notes">Notes Only</option>
            </select>

            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Contact
            </button>

            <button
              onClick={loadContacts}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {(isAdding || editingIndex !== null) && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800">
                {isAdding ? 'Add New Contact' : 'Edit Contact'}
              </h2>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setEditingIndex(null);
                  setFormData({ name: '', email: '', notes: '' });
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="3"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={isAdding ? handleAdd : handleUpdate}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {isAdding ? 'Add to Sheets' : 'Update in Sheets'}
            </button>
          </div>
        )}

        {/* Contacts Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th
                    onClick={() => handleSort('name')}
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  >
                    Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('email')}
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  >
                    Email {sortField === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading && contacts.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                      Loading contacts from Google Sheets...
                    </td>
                  </tr>
                ) : filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                      {searchTerm ? 'No contacts found matching your search' : 'No contacts yet. Add one to get started!'}
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((contact, index) => (
                    <tr key={contact.rowIndex} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-900">{contact.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{contact.email}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-md truncate">{contact.notes}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleEdit(contact, contacts.indexOf(contact))}
                            disabled={loading}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteFromSheet(contact.rowIndex)}
                            disabled={loading}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-slate-600">
          <p>Data synced with Google Sheets • Click Refresh to see updates from the sheet</p>
        </div>
      </div>
    </div>
  );
}