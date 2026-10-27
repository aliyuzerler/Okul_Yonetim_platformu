import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@carbon/react";
import GeneralSettingsTab from "@/features/school/components/GeneralSettingsTab";
import ActivationTab from "@/features/activation/components/ActivationTab";
import EmailTab from "@/features/email/components/EmailTab";
import HousesPanel from "@/features/school/components/HousesPanel";
import AuditLog from "@/features/system/components/AuditLog";
import OrphanedAccounts from "@/features/system/components/OrphanedAccounts";
import Automation from "@/features/system/components/Automation";

export default function SettingsPage() {
  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Ayarlar</h1>
          <p className="os-page__subtitle">Okul yapılandırması ve sistem tercihleri</p>
        </div>
      </div>

      <Tabs>
        <TabList aria-label="Ayarlar bölümleri">
          <Tab>Genel</Tab>
          <Tab>Kollar</Tab>
          <Tab>Hesap etkinleştirme</Tab>
          <Tab>E-posta</Tab>
          <Tab>Denetim kaydı</Tab>
          <Tab>Sahipsiz hesaplar</Tab>
          <Tab>Otomasyon</Tab>
        </TabList>
        <TabPanels>
          <TabPanel className="os-p-0"><GeneralSettingsTab /></TabPanel>
          <TabPanel className="os-p-0"><div className="os-mt-4"><HousesPanel /></div></TabPanel>
          <TabPanel className="os-p-0"><ActivationTab /></TabPanel>
          <TabPanel className="os-p-0"><EmailTab /></TabPanel>
          <TabPanel className="os-p-0"><div className="os-mt-4"><AuditLog /></div></TabPanel>
          <TabPanel className="os-p-0"><div className="os-mt-4"><OrphanedAccounts /></div></TabPanel>
          <TabPanel className="os-p-0"><div className="os-mt-4"><Automation inline /></div></TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
