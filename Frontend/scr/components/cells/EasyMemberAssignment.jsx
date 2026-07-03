import { useState, useEffect } from 'react';
import { cellsAPI, zonesAPI } from '../utils/api';
import { toast } from 'react-toastify';
import { Users, Plus, X, Check, AlertCircle, ChevronDown } from 'lucide-react';

/**
 * EasyMemberAssignment - Simplified UI for assigning members to cells
 * Supports:
 * - Single member assignment (drag-drop or select)
 * - Bulk member assignment (multi-select)
 * - Zone leaders can assign to their cells
 * - Cell leaders can assign to their cell
 * - Admins can assign to any cell
 */
export default function EasyMemberAssignment({ cell, zoneId, onAssignmentComplete, allowBulk = true }) {
  const [mode, setMode] = useState('single'); // 'single', 'bulk', 'search'
  const [showModal, setShowModal] = useState(false);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Compute filtered members based on search
  const filteredMembers = availableMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Load available members when modal opens
  useEffect(() => {
    if (showModal) {
      loadAvailableMembers();
    }
  }, [showModal]);

  const loadAvailableMembers = async () => {
    try {
      setLoading(true);
      const res = await cellsAPI.getAvailableMembers(cell.id);
      const members = (res.data || res || []).map(member => ({
        id: member.id || member.user_id,
        name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
        email: member.email,
        phone: member.phone,
        role: member.role
      }));
      setAvailableMembers(members);
    } catch (error) {
      console.error('Error loading available members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleSingleAssign = async (memberId) => {
    try {
      setAssigning(true);
      await cellsAPI.assignMember(cell.id, memberId);
      toast.success('Member assigned successfully!');
      setShowModal(false);
      setSelectedMembers(new Set());
      onAssignmentComplete?.();
    } catch (error) {
      toast.error(error.message || 'Failed to assign member');
    } finally {
      setAssigning(false);
    }
  };

  const handleBulkAssign = async () => {
    if (selectedMembers.size === 0) {
      toast.error('Select at least one member');
      return;
    }

    try {
      setAssigning(true);
      const memberIds = Array.from(selectedMembers);
      await cellsAPI.bulkAssignMembers(cell.id, memberIds);
      toast.success(`${memberIds.length} members assigned successfully!`);
      setShowModal(false);
      setSelectedMembers(new Set());
      onAssignmentComplete?.();
    } catch (error) {
      toast.error(error.message || 'Failed to bulk assign members');
    } finally {
      setAssigning(false);
    }
  };

  const toggleMemberSelection = (memberId) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const selectAll = () => {
    if (selectedMembers.size === filteredMembers.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(filteredMembers.map(m => m.id)));
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      >
        <Plus size={18} />
        <span>Add Members</span>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Add Members to Cell</h2>
                <p className="text-purple-100 text-sm">{cell.name}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:bg-white/20 p-1 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Mode Selector */}
            <div className="flex border-b px-6 py-3 gap-2">
              <button
                onClick={() => { setMode('single'); setSearchQuery(''); }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'single'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Single Assign
              </button>
              {allowBulk && (
                <button
                  onClick={() => { setMode('bulk'); setSearchQuery(''); }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    mode === 'bulk'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Bulk Assign ({selectedMembers.size})
                </button>
              )}
              <button
                onClick={() => setMode('search')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ml-auto ${
                  mode === 'search'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Search
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-6 py-3 border-b bg-gray-50">
              <input
                type="text"
                placeholder="🔍 Search members by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Member List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full mx-auto mb-2"></div>
                  Loading members...
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No members available</p>
                </div>
              ) : (
                <>
                  {/* Select All (Bulk Mode) */}
                  {mode === 'bulk' && filteredMembers.length > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-2 sticky top-0">
                      <input
                        type="checkbox"
                        checked={selectedMembers.size === filteredMembers.length && filteredMembers.length > 0}
                        onChange={selectAll}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <label className="text-sm font-medium text-gray-700 cursor-pointer flex-1">
                        Select All ({filteredMembers.length})
                      </label>
                    </div>
                  )}

                  {/* Members List */}
                  {filteredMembers.map(member => (
                    <div
                      key={member.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        mode === 'bulk' && selectedMembers.has(member.id)
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                      onClick={() => {
                        if (mode === 'bulk') {
                          toggleMemberSelection(member.id);
                        }
                      }}
                    >
                      {mode === 'bulk' && (
                        <input
                          type="checkbox"
                          checked={selectedMembers.has(member.id)}
                          onChange={() => toggleMemberSelection(member.id)}
                          className="w-4 h-4 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}

                      {/* Member Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{member.name}</p>
                        <p className="text-xs text-gray-600 truncate">{member.email}</p>
                      </div>

                      {/* Role Badge */}
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full whitespace-nowrap">
                        {member.role}
                      </span>

                      {/* Quick Assign Button (Single Mode) */}
                      {mode === 'single' && (
                        <button
                          onClick={() => handleSingleAssign(member.id)}
                          disabled={assigning}
                          className="ml-2 p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Check size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {mode === 'bulk' && selectedMembers.size > 0 && (
                  `${selectedMembers.size} member(s) selected`
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                {mode === 'bulk' && (
                  <button
                    onClick={handleBulkAssign}
                    disabled={assigning || selectedMembers.size === 0}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {assigning ? 'Assigning...' : `Assign ${selectedMembers.size}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
