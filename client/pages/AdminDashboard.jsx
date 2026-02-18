import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/dashboard-layout/DashboardLayout';
import DataTable from '../components/data-table/DataTable';
import EmptyState from '../components/empty-state/EmptyState';
import KpiCard from '../components/kpi-card/KpiCard';
import LoadingSpinner from '../components/loading-spinner/LoadingSpinner';
import SectionHeader from '../components/section-header/SectionHeader';
import useAdminDashboard from '../hooks/useAdminDashboard';
import './admin-dashboard.styles.scss';

const formatDate = (value) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
};

const formatMinutes = (value) => `${value || 0} min`;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useAdminDashboard();

  useEffect(() => {
    if (error?.status === 401 || error?.status === 403) {
      navigate('/login', { replace: true });
    }
  }, [error, navigate]);

  if (isLoading) {
    return (
      <DashboardLayout title="Admin Dashboard">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout title="Admin Dashboard">
        <EmptyState message={error?.message || 'Could not load dashboard data.'} />
      </DashboardLayout>
    );
  }

  const metrics = data?.metrics || {};
  const widgets = data?.widgets || {};

  const studentsRows = widgets.studentsWithHighestPendingMinutes || [];
  const categoriesRows = widgets.mostFrequentBehaviourCategories || [];
  const incidentsRows = widgets.recentIncidents?.items || [];
  const detentionsRows = widgets.recentDetentions?.items || [];
  const rewardsRows = widgets.recentRewards?.items || [];

  const hasWidgetData =
    studentsRows.length > 0 ||
    categoriesRows.length > 0 ||
    incidentsRows.length > 0 ||
    detentionsRows.length > 0 ||
    rewardsRows.length > 0;

  const kpis = [
    { label: 'Incidents (7d)', value: metrics.totalIncidents7d || 0 },
    { label: 'Incidents (30d)', value: metrics.totalIncidents30d || 0 },
    { label: 'Detentions (7d)', value: metrics.totalDetentions7d || 0 },
    { label: 'Pending Detentions', value: metrics.detentionsByStatus?.pending || 0 },
    { label: 'Minutes Remaining', value: formatMinutes(metrics.minutesRemainingTotal) },
    { label: 'Rewards (7d)', value: formatMinutes(metrics.rewardMinutesAwarded7d) },
    { label: 'Offset Minutes (7d)', value: formatMinutes(metrics.offsetMinutesApplied7d) },
  ];

  return (
    <DashboardLayout title="Admin Dashboard">
      <section className="dashboard-section">
        <SectionHeader title="Overview" />
        <div className="kpi-grid">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} />
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <SectionHeader title="Needs Attention" />

        {!hasWidgetData ? (
          <EmptyState message="No data yet" />
        ) : (
          <div className="widget-grid">
            <article className="widget-card">
              <h3>Students with Highest Pending Minutes</h3>
              {studentsRows.length === 0 ? (
                <EmptyState message="No pending student minutes." />
              ) : (
                <DataTable
                  keyField="studentId"
                  columns={[
                    {
                      key: 'student',
                      header: 'Student',
                      render: (row) => (
                        <Link to={`/students/${row.studentId}`}>
                          {`${row.student?.firstName || ''} ${row.student?.lastName || ''}`.trim() ||
                            'Unknown student'}
                        </Link>
                      ),
                    },
                    {
                      key: 'pendingMinutes',
                      header: 'Pending Minutes',
                      render: (row) => formatMinutes(row.pendingMinutes),
                    },
                  ]}
                  rows={studentsRows}
                />
              )}
            </article>

            <article className="widget-card">
              <h3>Most Frequent Behaviour Categories</h3>
              {categoriesRows.length === 0 ? (
                <EmptyState message="No behaviour categories yet." />
              ) : (
                <DataTable
                  keyField="categoryId"
                  columns={[
                    {
                      key: 'categoryName',
                      header: 'Category',
                      render: (row) => row.categoryName || 'Uncategorized',
                    },
                    { key: 'count', header: 'Count' },
                  ]}
                  rows={categoriesRows}
                />
              )}
            </article>

            <article className="widget-card">
              <h3>Recent Incidents</h3>
              {incidentsRows.length === 0 ? (
                <EmptyState message="No incidents found." />
              ) : (
                <DataTable
                  keyField="_id"
                  columns={[
                    { key: 'studentId', header: 'Student' },
                    { key: 'categoryId', header: 'Category' },
                    {
                      key: 'occurredAt',
                      header: 'Date',
                      render: (row) => formatDate(row.occurredAt),
                    },
                  ]}
                  rows={incidentsRows}
                />
              )}
            </article>

            <article className="widget-card">
              <h3>Recent Detentions</h3>
              {detentionsRows.length === 0 ? (
                <EmptyState message="No detentions found." />
              ) : (
                <DataTable
                  keyField="_id"
                  columns={[
                    { key: 'studentId', header: 'Student' },
                    { key: 'status', header: 'Status' },
                    {
                      key: 'minutesRemaining',
                      header: 'Minutes Remaining',
                      render: (row) => formatMinutes(row.minutesRemaining),
                    },
                  ]}
                  rows={detentionsRows}
                />
              )}
            </article>

            <article className="widget-card">
              <h3>Recent Rewards</h3>
              {rewardsRows.length === 0 ? (
                <EmptyState message="No rewards found." />
              ) : (
                <DataTable
                  keyField="_id"
                  columns={[
                    { key: 'studentId', header: 'Student' },
                    {
                      key: 'minutesAwarded',
                      header: 'Minutes',
                      render: (row) => formatMinutes(row.minutesAwarded),
                    },
                    {
                      key: 'awardedAt',
                      header: 'Date',
                      render: (row) => formatDate(row.awardedAt),
                    },
                  ]}
                  rows={rewardsRows}
                />
              )}
            </article>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
};

export default AdminDashboard;
