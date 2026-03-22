export default function Loading() {
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', minHeight:'100vh', gap:16,
      background:'#0F1218',
    }}>
      {/* Soccer ball spinner */}
      <div style={{ position:'relative', width:60, height:60 }}>
        <div style={{
          width:60, height:60, borderRadius:'50%',
          border:'3px solid #232832',
          borderTop:'3px solid #00C853',
          animation:'spin 1s linear infinite',
        }}/>
        <div style={{
          position:'absolute', top:'50%', left:'50%',
          transform:'translate(-50%,-50%)',
          fontSize:24,
        }}>⚽</div>
      </div>
      <div style={{
        fontFamily:"'Bebas Neue',sans-serif",
        fontSize:28, letterSpacing:3, color:'#00C853',
      }}>
        AJ<span style={{color:'#fff'}}>Tips</span>
      </div>
      <div style={{ color:'#9E9E9E', fontSize:13 }}>Loading today's fixtures...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
