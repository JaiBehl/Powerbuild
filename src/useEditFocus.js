import {useEffect,useRef} from 'react';

// Inline editors already live beside their source item (Train exercise,
// logged food or Saved Food). After React renders the new editing fields,
// bring that editor into view and put the keyboard focus on its first input.
export default function useEditFocus(editingId){
  const editorRef=useRef(null);
  useEffect(()=>{
    if(editingId==null)return;
    const frame=requestAnimationFrame(()=>{
      const editor=editorRef.current;
      if(!editor)return;
      editor.scrollIntoView({behavior:'smooth',block:'nearest'});
      editor.querySelector('input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])')?.focus({preventScroll:true});
    });
    return ()=>cancelAnimationFrame(frame);
  },[editingId]);
  return editorRef;
}
