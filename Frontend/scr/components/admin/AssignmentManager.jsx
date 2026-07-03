import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { membersAPI, zonesAPI } from '../../utils/api';
import { Users, MapPin, Check, X, Loader } from 'lucide-react';

export default function AssignmentManager() {
  const [members, setMembers] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [membersRes, zonesRes] = await Promise.allSettled([
        membersAPI.getAll({ limit: 1000 }),
        zonesAPI.getAll({ is_active: 1 })
      ]);

      const membersList = membersRes.status === 'fulfilled' 
        ? (Array.isArray(membersRes.value) ? membersRes.value : membersRes.value?.data || [])
        : [];
      
      const zonesList = zonesRes.status === 'fulfilled'
        ? (Array.isArray(zonesRes.value) ? zonesRes.value : zonesRes.value?.data || [])
        : [];

      setMembers(membersList);
      setZones(zonesList);

      // Build assignments from member data
      const assignmentsList = membersList.filter(m => m.zone_id).map(m => ({
        memberId: m.id,
        zoneId: m.zone_id,
        memberName: `${m.first_name} ${m.last_name}`,
        zoneName: zonesList.find(z => z.id === m.zone_id)?.name || 'Unknown Zone'
      }));
      setAssignments(assignmentsList);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedMember || !selectedZone) {
      toast.error('Please select both member and zone');
      return;
    }

    if (assignments.some(a => a.memberId === selectedMember.id && a.zoneId === selectedZone)) {
      toast.warning('Member already assigned to this zone');
      return;
    }

    setAssigning(true);
    try {
      const result = await zonesAPI.assignMember(selectedZone, selectedMember.id);

      if (result.status === 'success' || result.success) {
        toast.success(
          selectedMember.zone_id
            ? `${selectedMember.first_name} transferred successfully`
            : `${selectedMember.first_name} assigned to zone successfully`
        );
        setSelectedMember(null);
        setSelectedZone(null);
        await loadData();
      } else {
        toast.error(result.message || 'Failed to assign member');
      }
    } catch (error) {
      console.error('Error assigning member:', error);
      toast.error(error.message || 'Failed to assign member');
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async (memberId) => {
    if (!window.confirm('Remove this member from zone?')) return;

    try {
      const assignment = assignments.find((item) => item.memberId === memberId);
      if (!assignment) {
        toast.error('Assignment not found');
        return;
      }

      const result = await zonesAPI.removeMember(assignment.zoneId, memberId);

      if (result.status === 'success' || result.success) {
        toast.success('Member removed from zone');
        await loadData();
      }
    } catch (error) {
      console.error('Error unassigning member:', error);
      toast.error('Failed to remove member');
    }
  };

  const filteredMembers = members.filter(m => {
    const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const filteredAssignments = assignments.filter(a => 
    a.memberName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assignment Form */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Assign Members to Zones</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Member
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Member
            </label>
            <select
              value={selectedMember?.id || ''}
              onChange={(e) => {
                const member = members.find(m => m.id === parseInt(e.target.value));
                setSelectedMember(member || null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Choose member...</option>
              {filteredMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.first_name} {member.last_name}{member.zone_name ? ` (${member.zone_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Zone
            </label>
            <select
              value={selectedZone || ''}
              onChange={(e) => setSelectedZone(parseInt(e.target.value) || null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Choose zone...</option>
              {zones.map(zone => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleAssign}
          disabled={!selectedMember || !selectedZone || assigning}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium flex items-center justify-center"
        >
          {assigning ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Assigning...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              {selectedMember?.zone_id ? 'Transfer Member' : 'Assign Member'}
            </>
          )}
        </button>
      </div>

      {/* Current Assignments */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <MapPin className="w-6 h-6 text-green-600" />
          <h3 className="text-xl font-bold text-gray-900">Current Assignments</h3>
          <span className="ml-auto bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {filteredAssignments.length}
          </span>
        </div>

        {filteredAssignments.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No assignments yet</p>
            <p className="text-gray-500 text-sm mt-2">Assign members to zones using the form above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAssignments.map((assignment) => (
              <div
                key={`${assignment.memberId}-${assignment.zoneId}`}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{assignment.memberName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <p className="text-sm text-gray-600 truncate">{assignment.zoneName}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleUnassign(assignment.memberId)}
                  className="ml-2 p-2 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5 text-red-600" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
