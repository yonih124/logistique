import { useState } from 'react'
import { updatePassword, updateProfile, updateProfilePhoto } from '@/services/authService'
import { roleLabel } from '@/app/routes'

export function ProfilePage({ user, setUser, notify }) {
  const [profile, setProfile] = useState({ name: user.name, email: user.email || '', service: user.service, avatar: user.avatar || '' })
  const [pendingPhoto, setPendingPhoto] = useState('')
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const chooseImage = event => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return notify('Choisissez une image JPG, PNG ou WebP', 'error')
    if (file.size > 2 * 1024 * 1024) return notify("L'image ne doit pas dépasser 2 Mo", 'error')
    const reader = new FileReader()
    reader.onload = () => {
      setProfile(current => ({ ...current, avatar: reader.result }))
      setPendingPhoto(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const saveProfile = async event => {
    event.preventDefault()
    setSavingProfile(true)
    try {
      let updated = await updateProfile(profile)
      if (pendingPhoto) updated = await updateProfilePhoto(pendingPhoto)
      setUser(current => ({ ...current, ...updated }))
      setProfile({ name: updated.name, email: updated.email, service: updated.service, avatar: updated.avatar })
      setPendingPhoto('')
      notify('Profil mis à jour')
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const changePassword = async event => {
    event.preventDefault()
    if (password.next !== password.confirm) return notify('Les mots de passe ne correspondent pas', 'error')
    setSavingPassword(true)
    try {
      await updatePassword(password.current, password.next)
      setPassword({ current: '', next: '', confirm: '' })
      notify('Mot de passe modifié')
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setSavingPassword(false)
    }
  }

  const initials = profile.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()

  return <div className="profile-layout">
    <aside className="profile-card">
      <div className="profile-picture">
        {profile.avatar ? <img src={profile.avatar} alt="Photo de profil" /> : <span>{initials}</span>}
        <label title="Changer la photo">✎<input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} /></label>
      </div>
      <h2>{profile.name}</h2><span>{roleLabel(user.role)}</span><p>{profile.service}</p><strong className="profile-im"># {user.im}</strong>
      <div className="photo-actions"><label>Changer la photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} /></label><small>{pendingPhoto ? 'Nouvelle photo prête à être enregistrée' : 'JPG, PNG ou WebP • 2 Mo maximum'}</small></div>
    </aside>
    <div className="profile-forms">
      <form className="panel profile-form" onSubmit={saveProfile}>
        <header><div><h2>Informations personnelles</h2><p>L'IM est votre identifiant unique de connexion.</p></div></header>
        <div className="form-grid">
          <label className="form-field"><span>Numéro IM</span><input disabled value={user.im} /></label>
          <label className="form-field"><span>Nom complet</span><input required value={profile.name} onChange={event => setProfile({ ...profile, name: event.target.value })} /></label>
          <label className="form-field"><span>Adresse e-mail</span><input required type="email" value={profile.email} onChange={event => setProfile({ ...profile, email: event.target.value })} /></label>
          <label className="form-field"><span>Service</span><input required value={profile.service} onChange={event => setProfile({ ...profile, service: event.target.value })} /></label>
          <label className="form-field"><span>Rôle</span><input disabled value={roleLabel(user.role)} /></label>
        </div>
        <footer className="form-actions"><button className="primary" disabled={savingProfile}>{savingProfile ? 'Enregistrement…' : 'Enregistrer les modifications'}</button></footer>
      </form>
      <form className="panel profile-form" onSubmit={changePassword}>
        <header><div><h2>Changer le mot de passe</h2><p>Utilisez au minimum 8 caractères.</p></div><span className="security-icon">▣</span></header>
        <div className="form-grid password-grid">
          <label className="form-field"><span>Mot de passe actuel</span><input required autoComplete="current-password" type="password" value={password.current} onChange={event => setPassword({ ...password, current: event.target.value })} /></label>
          <label className="form-field"><span>Nouveau mot de passe</span><input required autoComplete="new-password" minLength="8" type="password" value={password.next} onChange={event => setPassword({ ...password, next: event.target.value })} /></label>
          <label className="form-field"><span>Confirmer le mot de passe</span><input required autoComplete="new-password" minLength="8" type="password" value={password.confirm} onChange={event => setPassword({ ...password, confirm: event.target.value })} /></label>
        </div>
        <footer className="form-actions"><button className="primary" disabled={savingPassword}>{savingPassword ? 'Modification…' : 'Modifier le mot de passe'}</button></footer>
      </form>
    </div>
  </div>
}
