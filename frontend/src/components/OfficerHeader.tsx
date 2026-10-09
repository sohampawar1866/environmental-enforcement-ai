import { signOut } from '../lib/auth-client';
import { LogOut, ShieldCheck, Radio } from 'lucide-react';

interface OfficerHeaderProps {
  user: {
    name?: string;
    email?: string;
    role?: string;
    badge_id?: string;
    rank?: string;
    jurisdiction?: string;
  };
}

export function OfficerHeader({ user }: OfficerHeaderProps) {
  const isWarden = user.role === 'warden';

  const handleSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  return (
    <div className={`officerBar ${isWarden ? 'wardenMode' : 'adjudicatorMode'}`}>
      <div className="officerInfo">
        <div className="officerIconWrap">
          {isWarden ? <Radio size={16} /> : <ShieldCheck size={16} />}
        </div>
        <div className="officerMeta">
          <div className="officerNameRow">
            <span className="officerName">{user.name || 'Sworn Officer'}</span>
            <span className={`officerRoleBadge ${user.role || 'adjudicator'}`}>
              {isWarden ? 'FIELD ENFORCEMENT WARDEN' : 'CONTROL ROOM ADJUDICATOR'}
            </span>
          </div>
          <div className="officerSubDetails">
            <span>BADGE: <b>{user.badge_id || (isWarden ? 'FP-108' : 'MCE-9042')}</b></span>
            <span className="dotDivider">·</span>
            <span>{user.jurisdiction || 'Downtown Sector 7'}</span>
            <span className="dotDivider">·</span>
            <span className="dutyStatus"><span className="liveDot" /> ACTIVE DUTY</span>
          </div>
        </div>
      </div>

      <button className="signOutBtn" onClick={handleSignOut} title="Sign Out of Municipal Terminal">
        <LogOut size={14} />
        <span>Sign Out</span>
      </button>
    </div>
  );
}
