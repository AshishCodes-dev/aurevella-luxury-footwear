import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Phone,
  User,
  Filter,
  CheckCheck,
} from 'lucide-react';
import { fetchAdminInquiries, updateAdminInquiryStatus } from '../../utils/api.js';

export const AdminInquiries = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'new', 'read', 'replied'

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalInquiries, setTotalInquiries] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // Detail Modal / Drawer State
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Fetch inquiries from API
  const loadInquiries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        limit: 15,
      };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await fetchAdminInquiries(params);
      if (res?.status === 'success') {
        setInquiries(res.inquiries || []);
        setTotalInquiries(res.pagination?.total || 0);
        setTotalPages(res.pagination?.pages || 1);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve inquiries');
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, searchQuery]);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  // Handle status update
  const handleUpdateStatus = async (id, newStatus) => {
    setUpdatingStatus(true);
    setError(null);
    try {
      const res = await updateAdminInquiryStatus(id, newStatus);
      if (res?.status === 'success') {
        setActionSuccess(`Inquiry marked as ${newStatus}`);
        setTimeout(() => setActionSuccess(null), 3000);
        // Update local state
        setInquiries((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
        );
        if (selectedInquiry && selectedInquiry.id === id) {
          setSelectedInquiry((prev) => ({ ...prev, status: newStatus }));
        }
        // Refresh counts
        if (newStatus !== 'new') {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to update inquiry status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-amber-950/80 border border-amber-700/80 text-amber-300">
            New
          </span>
        );
      case 'read':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider bg-blue-950/60 border border-blue-800 text-blue-300">
            Read
          </span>
        );
      case 'replied':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider bg-emerald-950/60 border border-emerald-800 text-emerald-300">
            Replied
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] uppercase font-medium bg-[#1F1614] border border-[#2F1C15] text-[#B8AD9A]">
            {status}
          </span>
        );
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_) {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Metric Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-[#FEF5E6] flex items-center gap-2.5">
            <Mail size={22} className="text-[#FEF5E6]" />
            <span>Concierge & Client Inquiries</span>
          </h2>
          <p className="text-xs text-[#B8AD9A] pt-1">
            Review and respond to boutique client communications, bespoke fitting inquiries, and order notes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <span className="px-2.5 py-1 text-xs font-semibold bg-amber-950/80 border border-amber-700/80 text-amber-300">
              {unreadCount} Unread {unreadCount === 1 ? 'Inquiry' : 'Inquiries'}
            </span>
          )}
          <button
            type="button"
            onClick={loadInquiries}
            disabled={loading}
            className="p-2 border border-[#2F1C15] bg-[#140E0C] text-[#B8AD9A] hover:text-[#FEF5E6] hover:bg-[#1F1614] transition-subtle disabled:opacity-50"
            title="Refresh Inquiries"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle size={15} />
          <span>{actionSuccess}</span>
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#140E0C] border border-[#2F1C15] p-3.5">
        {/* Search */}
        <div className="sm:col-span-8 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#665B54]" />
          <input
            type="text"
            placeholder="Search by client name, email, or subject..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-[#0F0A09] border border-[#2F1C15] focus:border-[#FEF5E6] pl-9 pr-3 py-2 text-xs text-[#FEF5E6] placeholder-[#665B54] outline-none transition-subtle"
          />
        </div>

        {/* Status Filter */}
        <div className="sm:col-span-4 flex items-center gap-2">
          <Filter size={14} className="text-[#665B54] hidden sm:block shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-[#0F0A09] border border-[#2F1C15] focus:border-[#FEF5E6] px-3 py-2 text-xs text-[#FEF5E6] outline-none transition-subtle cursor-pointer"
          >
            <option value="all">All Inquiries ({totalInquiries})</option>
            <option value="new">New Inquiries</option>
            <option value="read">Read Inquiries</option>
            <option value="replied">Replied Inquiries</option>
          </select>
        </div>
      </div>

      {/* Inquiries Table */}
      <div className="bg-[#140E0C] border border-[#2F1C15] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#2F1C15] bg-[#181210] text-[#B8AD9A] uppercase tracking-wider font-medium text-[11px]">
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Received</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2F1C15]">
              {loading && inquiries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#665B54]">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Loading client inquiries...</span>
                    </div>
                  </td>
                </tr>
              ) : inquiries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#665B54]">
                    No inquiries found matching current filters.
                  </td>
                </tr>
              ) : (
                inquiries.map((inq) => (
                  <tr
                    key={inq.id}
                    className={`hover:bg-[#181210] transition-subtle cursor-pointer ${
                      inq.status === 'new' ? 'bg-[#181210]/40' : ''
                    }`}
                    onClick={() => {
                      setSelectedInquiry(inq);
                      // Auto-mark as read when opened if currently new
                      if (inq.status === 'new') {
                        handleUpdateStatus(inq.id, 'read');
                      }
                    }}
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(inq.status)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#FEF5E6]">{inq.name}</div>
                      <div className="text-[11px] text-[#B8AD9A] font-mono">{inq.email}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate">
                      <div className="text-[#FEF5E6] font-medium truncate">{inq.subject}</div>
                      <div className="text-[11px] text-[#665B54] truncate max-w-xs">
                        {inq.message}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-[#B8AD9A] text-[11px]">
                      {formatDate(inq.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedInquiry(inq);
                          if (inq.status === 'new') {
                            handleUpdateStatus(inq.id, 'read');
                          }
                        }}
                        className="px-2.5 py-1 text-[11px] uppercase tracking-wider font-medium border border-[#2F1C15] bg-[#0F0A09] text-[#FEF5E6] hover:bg-[#1F1614] hover:border-[#FEF5E6]/40 transition-subtle"
                      >
                        View Dossier
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="border-t border-[#2F1C15] p-3.5 flex items-center justify-between text-xs text-[#B8AD9A] bg-[#181210]">
            <span>
              Page <strong className="text-[#FEF5E6]">{currentPage}</strong> of{' '}
              <strong className="text-[#FEF5E6]">{totalPages}</strong> ({totalInquiries} total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loading}
                className="p-1.5 border border-[#2F1C15] bg-[#140E0C] text-[#FEF5E6] hover:bg-[#1F1614] disabled:opacity-30 disabled:pointer-events-none transition-subtle"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || loading}
                className="p-1.5 border border-[#2F1C15] bg-[#140E0C] text-[#FEF5E6] hover:bg-[#1F1614] disabled:opacity-30 disabled:pointer-events-none transition-subtle"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inquiry Detail Dossier Modal */}
      {selectedInquiry && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedInquiry(null)}
        >
          <div
            className="w-full max-w-2xl bg-[#140E0C] border border-[#2F1C15] p-6 sm:p-8 space-y-6 text-[#FEF5E6] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#2F1C15] pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#B8AD9A] font-semibold block">
                  Client Communication Dossier
                </span>
                <h3 className="font-serif text-xl text-[#FEF5E6] pt-1">
                  {selectedInquiry.subject}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInquiry(null)}
                className="p-1.5 text-[#B8AD9A] hover:text-[#FEF5E6] border border-transparent hover:border-[#2F1C15] transition-subtle"
              >
                <X size={18} />
              </button>
            </div>

            {/* Client Meta Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#181210] border border-[#2F1C15] p-4 text-xs">
              <div className="space-y-1">
                <span className="text-[11px] text-[#665B54] uppercase tracking-wider block">
                  Client Name
                </span>
                <span className="text-[#FEF5E6] font-medium flex items-center gap-1.5">
                  <User size={13} className="text-[#B8AD9A]" />
                  {selectedInquiry.name}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-[#665B54] uppercase tracking-wider block">
                  Email Address
                </span>
                <a
                  href={`mailto:${selectedInquiry.email}`}
                  className="text-amber-300 hover:underline font-mono"
                >
                  {selectedInquiry.email}
                </a>
              </div>

              {selectedInquiry.phone && (
                <div className="space-y-1">
                  <span className="text-[11px] text-[#665B54] uppercase tracking-wider block">
                    Contact Phone
                  </span>
                  <a
                    href={`tel:${selectedInquiry.phone}`}
                    className="text-[#FEF5E6] hover:underline font-mono flex items-center gap-1.5"
                  >
                    <Phone size={13} className="text-[#B8AD9A]" />
                    {selectedInquiry.phone}
                  </a>
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[11px] text-[#665B54] uppercase tracking-wider block">
                  Received Timestamp
                </span>
                <span className="text-[#B8AD9A] flex items-center gap-1.5">
                  <Clock size={13} />
                  {formatDate(selectedInquiry.createdAt)}
                </span>
              </div>
            </div>

            {/* Inquiry Content */}
            <div className="space-y-2">
              <span className="text-[11px] text-[#665B54] uppercase tracking-wider font-semibold block">
                Client Message
              </span>
              <div className="p-4 bg-[#0F0A09] border border-[#2F1C15] text-xs text-[#FEF5E6] leading-relaxed whitespace-pre-wrap font-sans">
                {selectedInquiry.message}
              </div>
            </div>

            {/* Status & Operational Actions */}
            <div className="border-t border-[#2F1C15] pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#B8AD9A]">Current Status:</span>
                {getStatusBadge(selectedInquiry.status)}
              </div>

              <div className="flex items-center gap-2">
                {selectedInquiry.status !== 'read' && (
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => handleUpdateStatus(selectedInquiry.id, 'read')}
                    className="px-3 py-1.5 text-xs border border-[#2F1C15] bg-[#181210] text-[#B8AD9A] hover:text-[#FEF5E6] hover:border-[#FEF5E6]/40 transition-subtle disabled:opacity-50"
                  >
                    Mark as Read
                  </button>
                )}
                {selectedInquiry.status !== 'replied' && (
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => handleUpdateStatus(selectedInquiry.id, 'replied')}
                    className="px-3 py-1.5 text-xs bg-emerald-950/80 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 transition-subtle flex items-center gap-1.5 disabled:opacity-50 font-semibold"
                  >
                    <CheckCheck size={14} />
                    <span>Mark as Replied</span>
                  </button>
                )}
                <a
                  href={`mailto:${selectedInquiry.email}?subject=${encodeURIComponent(
                    `Re: ${selectedInquiry.subject} — AUREVELLA Concierge`
                  )}`}
                  className="px-3 py-1.5 text-xs bg-[#FEF5E6] text-[#0F0A09] hover:bg-white transition-subtle font-semibold flex items-center gap-1.5"
                >
                  <Mail size={13} />
                  <span>Compose Email Reply</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInquiries;
