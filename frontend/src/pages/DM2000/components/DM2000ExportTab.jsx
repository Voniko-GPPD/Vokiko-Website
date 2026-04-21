import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Descriptions, Empty, Radio, Space, Spin, notification } from 'antd';
import { downloadDM2000Report, fetchDM2000Templates } from '../../../api/dm2000Api';
import { useLang } from '../../../contexts/LangContext';

export default function DM2000ExportTab({ stationId, selection, selectedBaty, onBatyChange }) {
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    let active = true;
    setTemplates([]);
    setTemplateName('');
    if (!stationId) {
      setLoading(false);
      return () => {};
    }

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await fetchDM2000Templates(stationId);
        if (!active) return;
        setTemplates(result || []);
        if ((result || []).length > 0) {
          setTemplateName(result[0]);
        }
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Failed to load templates');
      } finally {
        if (!active) return;
        setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [stationId]);

  const batteryOptions = useMemo(() => [
    { label: `${t('dm2000BatteryAverage')} (0)`, value: 0 },
    ...Array.from({ length: 8 }).map((_, index) => ({ label: `${index + 1}#`, value: index + 1 })),
  ], [t]);

  const handleDownload = async () => {
    if (!stationId || !selection?.archname || !templateName) return;
    setDownloading(true);
    try {
      await downloadDM2000Report({
        stationId,
        archname: selection.archname,
        baty: selectedBaty,
        templateName,
      });
      notification.success({ message: t('dmpReportDownloaded') });
    } catch (err) {
      notification.error({ message: t('dmpReportDownloadFailed'), description: err.message });
    } finally {
      setDownloading(false);
    }
  };

  if (!selection) {
    return <Empty description={t('dm2000SelectArchive')} />;
  }

  if (loading) {
    return <Spin />;
  }

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {error && <Alert type="error" showIcon message={error} />}

      <Card size="small" title={t('dm2000SelectBattery')}>
        <Radio.Group
          optionType="button"
          buttonStyle="solid"
          options={batteryOptions}
          value={selectedBaty}
          onChange={(event) => onBatyChange(event.target.value)}
        />
      </Card>

      <Card size="small" title={t('dmpExportTab')}>
        {templates.length === 0 ? (
          <Empty description={t('dmpNoTemplates')} />
        ) : (
          <Radio.Group
            value={templateName}
            onChange={(event) => setTemplateName(event.target.value)}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {templates.map((name) => (
                <Card key={name} size="small">
                  <Radio value={name}>{name}</Radio>
                </Card>
              ))}
            </Space>
          </Radio.Group>
        )}
      </Card>

      <Card size="small" title={t('dm2000ArchName')}>
        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label={t('dm2000ArchName')}>{selection.archname || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('dm2000Type')}>{selection.dcxh || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('dm2000StartDate')}>{selection.startdate || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('dm2000Manufacturer')}>{selection.manufacturer || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('dm2000SerialNo')}>{selection.serialno || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('dm2000Remarks')}>{selection.remarks || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Button
        type="primary"
        onClick={handleDownload}
        loading={downloading}
        disabled={!stationId || !selection?.archname || !templateName}
      >
        {t('dm2000DownloadReport')}
      </Button>
    </Space>
  );
}
