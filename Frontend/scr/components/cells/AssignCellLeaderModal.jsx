import { useState, useEffect } from 'react';
import { cellsAPI } from '../../utils/api';
import { toast } from 'react-toastify';
import { Users, Plus, X, Check, AlertCircle, Search } from 'lucide-react';

/**
 * AssignCellLeaderModal - Allows zone leaders to assign leaders to cells
 * Only shows members who can be cell leaders (cell_leader, elder, pastor, admin role)
 */
export default function AssignCellLeaderModal({ cell, currentLeader, onAssignmentComplete }) {
  const [showModal, setShowModal] = useState(false);
  const [availableLeaders, setAvailableLeaders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedLeaderId, setSelectedLeaderId] = useState(null);

  // Filter leaders based on search
  const filteredLeaders = availableLeaders.filter(leader =>
    leader.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    leader.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Load available leaders when modal opens
  useEffect(() => {
    if (showModal) {
      loadAvailableLeaders();
    }
  }, [showModal]);

  const loadAvailableLeaders = async () => {
    try {
      setLoading(true);
      // Get all available members and filter for leadership roles
      const res = await cellsAPI.getAvailableMembers(cell.id);
      const leaders = (res.data || res || [])
        .filter(member => {
          const role = member.role?.toLowerCase();
          return ['cell_leader', 'elder', 'pastor', 'admin', 'superadmin'].includes(role);
        })
        .map(member => ({
          id: member.id || member.user_id,
          name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
          email: member.email,
          role: member.role,
          isCurrent: currentLeader?.id === (member.id || member.user_id)
        }));
      
      setAvailableLeaders(leaders);
      
      if (leaders.length === 0) {
        toast.info('No eligible members available for leadership role in this zone');
      }
    } catch (error) {
      console.error('Error loading available leaders:', error);
      toast.error('Failed to load eligible members');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignLeader = async () => {
    if (!selectedLeaderId) {
      toast.error('Please select a member to assign as leader');
      return;
    }

    try {
      setAssigning(true);
      await cellsAPI.assignLeader(cell.id, selectedLeaderId);
      toast.success('Cell leader assigned successfully!');
      setShowModal(false);
      setSelectedLeaderId(null);
      setSearchQuery('');
      onAssignmentComplete?.();
    } catch (error) {
      toast.error(error.message || 'Failed to assign cell leader');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <>
      {/* Button to open modal */}
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
      >
        <Users size={14} />
        {currentLeader ? 'Change Leader' : 'Assign Leader'}
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {currentLeader ? 'Change' : 'Assign'} Cell Leader
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedLeaderId(null);
                  setSearchQuery('');
                }}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Current Leader */}
              {currentLeader && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">Current Leader:</p>
                  <p className="font-medium text-gray-900">{currentLeader.name}</p>
                  <p className="text-sm text-gray-600">{currentLeader.email}</p>
                </div>
              )}

              {/* Search Box */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              {/* Available Leaders List */}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {loading ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : filteredLeaders.length === 0 ? (
                  <div className="flex items-center gap-2 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <AlertCircle size={18} className="text-yellow-600" />
                    <p className="text-sm text-yellow-700">
                      {searchQuery ? 'No members found matching your search' : 'No eligible members available'}
                    </p>
                  </div>
                ) : (
                  filteredLeaders.map(leader => (
                    <button
                      key={leader.id}
                      onClick={() => setSelectedLeaderId(leader.id)}
                      disabled={leader.isCurrent || assigning}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        selectedLeaderId === leader.id
                          ? 'border-blue-500 bg-blue-50'
                          : leader.isCurrent
                          ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{leader.name}</p>
                          <p className="text-sm text-gray-600">{leader.email}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                            {leader.role}
                          </span>
                        </div>
                        {selectedLeaderId === leader.id && (
                          <Check size={20} className="text-blue-600 mt-1" />
                        )}
                        {leader.isCurrent && (
                          <span className="text-xs font-semibold text-gray-500">CURRENT</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedLeaderId(null);
                  setSearchQuery('');
                }}
                disabled={assigning}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignLeader}
                disabled={!selectedLeaderId || assigning}
                className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {assigning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Assigning...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Assign Leader
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
