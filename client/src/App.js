import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
})

const icons = {
  hospital: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
  }),
  police: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
  }),
  ambulance: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
  })
}

const FIRSTAID_TYPES = [
  { emoji: '🩸', label: 'Bleeding' },
  { emoji: '🦴', label: 'Fracture' },
  { emoji: '🔥', label: 'Burns' },
  { emoji: '😵', label: 'Unconscious' },
  { emoji: '❤️', label: 'CPR' },
  { emoji: '🤕', label: 'Head Injury' },
]

function App() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: '🚨 RoadSOS Active. Your location is being detected. Describe your emergency and I will help immediately.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState(null)
  const [places, setPlaces] = useState([])
  const [showMap, setShowMap] = useState(false)
  const [showFirstAid, setShowFirstAid] = useState(false)
  const [firstAidSteps, setFirstAidSteps] = useState('')
  const [firstAidLoading, setFirstAidLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')
  const [locStatus, setLocStatus] = useState('detecting')
  const [sosActive, setSosActive] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => { getLocation() }, [])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const getLocation = () => {
    setLocStatus('detecting')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setLocation(coords)
        setLocStatus('detected')
        fetchNearbyPlaces(coords)
      },
      () => setLocStatus('denied')
    )
  }

  const fetchNearbyPlaces = async (coords) => {
    const res = await fetch(`http://localhost:5000/nearby?lat=${coords.lat}&lng=${coords.lng}`)
    const data = await res.json()
    setPlaces(data.places || [])
  }

  const fetchFirstAid = async (type) => {
    setFirstAidLoading(true)
    setFirstAidSteps('')
    const res = await fetch(`http://localhost:5000/firstaid?type=${type}`)
    const data = await res.json()
    setFirstAidSteps(data.steps)
    setFirstAidLoading(false)
  }

  const sendMessage = async (customMessage) => {
    const msg = customMessage || input
    if (!msg.trim()) return
    const locationText = location ? `User location: Lat ${location.lat.toFixed(4)}, Lng ${location.lng.toFixed(4)}.` : ''
    const fullMessage = locationText + ' ' + msg
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setInput('')
    setLoading(true)
    setActiveTab('chat')
    const response = await fetch('http://localhost:5000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: fullMessage, location })
    })
    const data = await response.json()
    setMessages(prev => [...prev, { role: 'bot', text: data.reply }])
    setLoading(false)
  }

  const handleSOS = () => {
    setSosActive(true)
    setTimeout(() => setSosActive(false), 3000)
    sendMessage('EMERGENCY SOS! I need immediate help! Please give me the nearest hospitals, ambulance numbers and first aid steps!')
  }

  return (
    <div style={{
      minHeight: '100vh', maxWidth: '700px', margin: '0 auto',
      background: '#f3e5d0', color: '#3e2b1f',
      fontFamily: "'Segoe UI', sans-serif",
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #d8b38b, #b99772)',
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 4px 20px rgba(185,154,127,0.35)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '50%',
            background: 'rgba(245,230,211,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
          }}>🚨</div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '20px', letterSpacing: '2px' }}>RoadSOS</div>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>Emergency Response System</div>
          </div>
        </div>
        <div style={{
          background: locStatus === 'detected' ? 'rgba(118,75,32,0.15)' : 'rgba(243,229,208,0.6)',
          border: `1px solid ${locStatus === 'detected' ? '#8b5e3c' : 'rgba(190,150,110,0.4)'}`,
          borderRadius: '20px', padding: '5px 12px', fontSize: '11px',
          display: 'flex', alignItems: 'center', gap: '5px'
        }}>
          <div style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: locStatus === 'detected' ? '#8b5e3c' : '#b07b4f',
            animation: 'pulse 1.5s infinite'
          }}/>
          {locStatus === 'detected' && location
            ? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`
            : locStatus === 'detecting' ? 'Detecting...' : 'Denied'}
        </div>
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div style={{
          background: '#8B4513', padding: '8px 16px',
          textAlign: 'center', fontSize: '13px', color: '#f5e6d3',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
        }}>
          ⚠️ You are offline — Emergency numbers still available: 108 | 100 | 112
        </div>
      )}

      {/* Tab navigation */}
      <div style={{
        display: 'flex', background: '#e3d1bc',
        borderBottom: '1px solid #d3b48c'
      }}>
        {[
          { id: 'chat', emoji: '💬', label: 'Chat' },
          { id: 'map', emoji: '🗺️', label: 'Map' },
          { id: 'firstaid', emoji: '🩺', label: 'First Aid' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: '12px 8px',
            background: activeTab === tab.id ? '#d1b38d' : 'transparent',
            border: 'none', borderBottom: activeTab === tab.id ? '2px solid #a57c52' : '2px solid transparent',
            color: activeTab === tab.id ? '#3e2b1f' : '#7f6245',
            cursor: 'pointer', fontSize: '13px', fontWeight: '600',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px'
          }}>
            <span style={{ fontSize: '18px' }}>{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Quick action buttons - always visible */}
      <div style={{
        display: 'flex', gap: '8px', padding: '10px 12px',
        background: '#e9dbc6', borderBottom: '1px solid #d3b48c'
      }}>
        {[
          { emoji: '🏥', label: 'Hospital' },
          { emoji: '🚔', label: 'Police' },
          { emoji: '🚑', label: 'Ambulance' },
          { emoji: '🔧', label: 'Towing' },
        ].map((btn, i) => (
          <button key={i} onClick={() => sendMessage(`Find nearest ${btn.label} to my location`)} style={{
            flex: 1, background: '#f5ede3', border: '1px solid #d9b68a',
            borderRadius: '10px', padding: '10px 4px', color: '#3e2b1f',
            cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '4px'
          }}>
            <span style={{ fontSize: '22px' }}>{btn.emoji}</span>
            <span style={{ fontSize: '11px', fontWeight: '600' }}>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '300px' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'bot' && (
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #d8b38b, #b99772)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginRight: '8px', flexShrink: 0, fontSize: '14px',
                  border: '1px solid #d1b38d'
                }}>🚨</div>
              )}
              <div style={{
                maxWidth: '78%', padding: '11px 15px',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: msg.role === 'user' ? 'linear-gradient(135deg, #d9b18e, #c9a77c)' : '#eee2d3',
                border: msg.role === 'bot' ? '1px solid #d3b48c' : 'none',
                fontSize: '14px', lineHeight: '1.6', color: '#3e2b1f'
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #d8b38b, #b99772)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', border: '1px solid #d1b38d'
              }}>🚨</div>
              <div style={{
                background: '#f1e5d2', border: '1px solid #d3b48c',
                borderRadius: '18px', padding: '11px 15px',
                fontSize: '14px', color: '#7f6245'
              }}>Analyzing emergency...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Map Tab */}
      {activeTab === 'map' && location && (
        <div style={{ flex: 1 }}>
          <div style={{ padding: '8px 12px', background: '#f0e3d1', fontSize: '12px', color: '#6f4e35' }}>
            🔴 Hospital &nbsp; 🔵 Police &nbsp; 🟢 Ambulance
          </div>
          <MapContainer center={[location.lat, location.lng]} zoom={13} style={{ height: '450px', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Circle center={[location.lat, location.lng]} radius={200} color="#8B4513" />
            <Marker position={[location.lat, location.lng]}>
              <Popup>📍 You are here</Popup>
            </Marker>
            {places.map((place, i) => (
              <Marker key={i} position={[place.lat, place.lng]} icon={icons[place.type] || icons.hospital}>
                <Popup><strong>{place.name}</strong><br />{place.type}<br />{place.phone}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {activeTab === 'map' && !location && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7f6245' }}>
          Location not detected. Please allow location access.
        </div>
      )}

      {/* First Aid Tab */}
      {activeTab === 'firstaid' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: '#7f6245' }}>
            🩺 Select emergency type for first aid steps:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            {FIRSTAID_TYPES.map((type, i) => (
              <button key={i} onClick={() => fetchFirstAid(type.label)} style={{
                background: '#f3e6d3', border: '1px solid #d3b48c',
                borderRadius: '12px', padding: '16px 12px', color: '#3e2b1f',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                fontSize: '14px', fontWeight: '600'
              }}>
                <span style={{ fontSize: '28px' }}>{type.emoji}</span>
                {type.label}
              </button>
            ))}
          </div>

          {firstAidLoading && (
            <div style={{ textAlign: 'center', color: '#7f6245', padding: '20px' }}>
              Loading first aid steps...
            </div>
          )}

          {firstAidSteps && !firstAidLoading && (
            <div style={{
              background: '#f1e4d4', border: '1px solid #d3b48c',
              borderRadius: '14px', padding: '16px'
            }}>
              <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#3e2b1f', whiteSpace: 'pre-line' }}>
                {firstAidSteps}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom input + SOS */}
      <div style={{ padding: '10px 14px', background: '#e9dbc6', borderTop: '1px solid #d3b48c' }}>
        <button onClick={handleSOS} style={{
          width: '100%', padding: '14px',
          background: sosActive ? '#b99772' : 'linear-gradient(135deg, #d8b38b, #b99772)',
          border: '2px solid #d3b48c', borderRadius: '12px', color: '#3e2b1f',
          fontSize: '17px', fontWeight: '800', cursor: 'pointer',
          letterSpacing: '3px', marginBottom: '10px',
          boxShadow: '0 4px 20px rgba(185,154,127,0.35)',
          transition: 'all 0.2s'
        }}>
          {sosActive ? '🚨 SOS SENT!' : '🆘 SOS EMERGENCY'}
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Describe your emergency..."
            style={{
              flex: 1, padding: '12px 16px', borderRadius: '12px',
              border: '1px solid #d3b48c', background: '#f7efe3',
              color: '#3e2b1f', fontSize: '14px', outline: 'none'
            }}
          />
          <button onClick={() => sendMessage()} style={{
            background: 'linear-gradient(135deg, #c9a77c, #b99772)',
            border: '1px solid #d3b48c', borderRadius: '12px',
            padding: '12px 20px', color: '#3e2b1f',
            cursor: 'pointer', fontSize: '18px'
          }}>➤</button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        input::placeholder { color: #7f6245; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #f3e5d0; }
        ::-webkit-scrollbar-thumb { background: #c9a77c; border-radius: 2px; }
      `}</style>
    </div>
  )
}

export default App