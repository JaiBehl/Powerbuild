import {PanelScopeContext} from './panelScope';
import {panelKey,readPanelCollapsed,savePanelCollapsed} from './panelState';
import React,{useState,useContext} from 'react';
import {Minus,Plus} from 'lucide-react';

// The heading, short description and right-side metric remain visible while
// the section is minimized. Keep content mounted to preserve any draft edits.
export default function CalorieSection({
  title,description,summary,children,className='',defaultCollapsed=false,collapseKey,
}){
  const scope=useContext(PanelScopeContext),key=panelKey(scope,collapseKey??title);
  const [state,setState]=useState(()=>({key,value:readPanelCollapsed(key,defaultCollapsed)}));
  const collapsed=state.key===key?state.value:readPanelCollapsed(key,defaultCollapsed);
  const toggle=()=>{const value=!collapsed;savePanelCollapsed(key,value);setState({key,value});};
  return <section className={'panel calorie-section '+className+(collapsed?' calorie-section-collapsed':'')}>
    <div className="calorie-section-header">
      <button
        type="button"
        className="calorie-section-toggle"
        onClick={toggle}
        aria-label={(collapsed?'Expand ':'Minimize ')+title}
        title={(collapsed?'Expand ':'Minimize ')+title}
        aria-expanded={!collapsed}
      >{collapsed?<Plus size={17}/>:<Minus size={17}/>}</button>
      <div className="calorie-section-heading">
        <h2>{title}</h2>
        {description&&<p className="muted calorie-section-description">{description}</p>}
      </div>
      {summary!==undefined&&summary!==null&&<div className="calorie-section-stat">{summary}</div>}
    </div>
    <div className="calorie-section-content" hidden={collapsed}>{children}</div>
  </section>;
}
