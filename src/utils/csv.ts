import { ActivityLog } from '../types';
import { formatDhakaDateTime } from './date';

export function exportActivityLogsToCSV(logs: ActivityLog[], filename = 'wednesday_united_activity_log.csv'): void {
  const headers = [
    'Timestamp (Asia/Dhaka)',
    'Actor Name',
    'Actor Email',
    'Actor Role',
    'Category',
    'Action',
    'Target Type',
    'Target ID',
    'Match ID',
    'Summary',
    'Before State',
    'After State'
  ];

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '""';
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const rows = logs.map(log => [
    escapeCSV(formatDhakaDateTime(log.timestamp)),
    escapeCSV(log.actorName),
    escapeCSV(log.actorEmail),
    escapeCSV(log.actorRole),
    escapeCSV(log.category),
    escapeCSV(log.action),
    escapeCSV(log.targetType),
    escapeCSV(log.targetId),
    escapeCSV(log.matchId || ''),
    escapeCSV(log.summary),
    escapeCSV(log.before ? JSON.stringify(log.before) : ''),
    escapeCSV(log.after ? JSON.stringify(log.after) : ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
