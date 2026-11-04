import { request } from '@/services/httpService'
import { useEffect, useState } from 'react'
import { Logo } from '@/components/ui/Logo'
import { login as loginRequest, register as registerRequest } from '@/services/authService'

const emptyAccount = { im: '', name: '', email: '', service: '', role: 'Client', password: '', confirm: '', avatar: '' }

export function LoginPage({ onLogin, notify }) {
  const [services, setServices] = useState([])
  const [servicesError, setServicesError] = useState('')
  const [register, setRegister] = useState(false)
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [imageError, setImageError] = useState('')
  const [form, setForm] = useState({ im: '', password: '', role: 'Dépositaire' })
  const [account, setAccount] = useState(emptyAccount)

  useEffect(() => {
    const formElement = document.querySelector('.login-form-area form')
    if (!formElement) return
    const passwordInputs = formElement.querySelectorAll('input[type="password"]')
    passwordInputs.forEach(input => input.setAttribute('autocomplete', register ? 'new-password' : 'current-password'))
    const identityInput = formElement.querySelector('input:not([type]), input[type="text"]')
    identityInput?.setAttribute('autocomplete', 'username')
  }, [register])

  useEffect(() => {
    if (!register) return
    let active = true
    request({ url: '/auth/services' }).then(rows => { if (active) setServices(rows) }).catch(error => { if (active) setServicesError(error.message) })
    return () => { active = false }
  }, [register])

  const login = async event => {
    event.preventDefault()
    setLoading(true)
    try {
      onLogin(await loginRequest(form.im, form.password))
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const chooseImage = event => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setImageError('Choisissez une image JPG, PNG ou WebP.')
    if (file.size > 2 * 1024 * 1024) return setImageError('La photo ne doit pas dépasser 2 Mo.')
    const reader = new FileReader()
    reader.onload = () => { setAccount(current => ({ ...current, avatar: reader.result })); setImageError('') }
    reader.readAsDataURL(file)
  }

  const submit = async event => {
    event.preventDefault()
    if (account.password !== account.confirm) return notify('Les mots de passe ne correspondent pas', 'error')
    setLoading(true)
    try {
      await registerRequest(account)
      setAccount(emptyAccount)
      setSent(true)
      notify('Inscription envoyée. Votre compte doit être approuvé par le validateur.')
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return <main className="login"><section className="login-hero"><Logo light /><div className="hero-copy"><span>GESTION • CONTRÔLE • TRAÇABILITÉ</span><h1>Une bonne gestion,<br /><em>Une meilleur performance.</em></h1><p></p></div><div className="hero-stats"><div><strong>100%</strong><small>Traçable</small></div><div><strong>3</strong><small>Profils métiers</small></div><div><strong>24/7</strong><small>Accessible</small></div></div><div className="hero-grid" /></section><section className="login-form-area">{!register ? <form onSubmit={login}><div className="mobile-logo"><Logo /></div><div className="welcome-icon">↗</div><h2>Heureux de vous revoir</h2><p>Connectez-vous avec votre numéro d’immatriculation.</p><label>Profil de démonstration<select value={form.role} onChange={event => setForm({ ...form, role: event.target.value })}><option>Dépositaire</option><option>Validateur</option><option>Client</option></select></label><label>Numéro IM<div className="field"><span>#</span><input required value={form.im} onChange={event => setForm({ ...form, im: event.target.value.toUpperCase() })} placeholder="Ex. IM-10428" /></div></label><label>Mot de passe<div className="field"><span>⌑</span><input required type={show ? 'text' : 'password'} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /><button type="button" onClick={() => setShow(!show)}>{show ? 'Masquer' : 'Afficher'}</button></div></label><div className="form-meta"><label><input type="checkbox" /> Se souvenir de moi</label><a href="#help">Mot de passe oublié ?</a></div><button className="login-button" disabled={loading}>{loading ? 'Connexion…' : 'Se connecter →'}</button><div className="register-invite"><span>Vous n’avez pas encore de compte ?</span><button type="button" onClick={() => setRegister(true)}>Créer un compte</button></div><small className="secure">▣ Connexion sécurisée • Données protégées</small></form> : sent ? <div className="registration-success"><span>✓</span><h2>Demande envoyée</h2><p>Votre inscription et votre photo ont été transmises au validateur. Vous pourrez vous connecter avec votre IM après son approbation.</p><button className="login-button" onClick={() => { setRegister(false); setSent(false) }}>Retour à la connexion</button></div> : <RegistrationForm services={services} servicesError={servicesError} account={account} setAccount={setAccount} imageError={imageError} chooseImage={chooseImage} submit={submit} close={() => setRegister(false)} /> }<footer>© 2026 Direction de la Solde et des Pensions</footer></section></main>
}

function RegistrationForm({ services, servicesError, account, setAccount, imageError, chooseImage, submit, close }) {
  return <form className="registration-form" onSubmit={submit}><button className="back-login" type="button" onClick={close}>← Retour à la connexion</button><h2>Créer un compte</h2><p>Ajoutez votre photo puis renseignez vos informations. Le compte devra être accepté par un validateur.</p><section className="registration-photo"><div className="registration-avatar">{account.avatar ? <img src={account.avatar} alt="Aperçu du profil" /> : <span>{account.name ? account.name.split(' ').map(word => word[0]).slice(0, 2).join('').toUpperCase() : '＋'}</span>}</div><div><strong>Photo de profil</strong><p>JPG, PNG ou WebP • 2 Mo maximum</p><div><label className="photo-upload">{account.avatar ? 'Changer la photo' : 'Choisir une photo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} /></label>{account.avatar && <button type="button" onClick={() => setAccount({ ...account, avatar: '' })}>Supprimer</button>}</div>{imageError && <small>{imageError}</small>}</div></section><div className="register-grid"><label>Numéro IM<input required value={account.im} onChange={event => setAccount({ ...account, im: event.target.value.toUpperCase() })} placeholder="Ex. IM-28417" /></label><label>Nom complet<input required value={account.name} onChange={event => setAccount({ ...account, name: event.target.value })} /></label><label>Adresse e-mail<input required type="email" value={account.email} onChange={event => setAccount({ ...account, email: event.target.value })} /></label><label>Service ou direction<select required disabled={!services.length} value={account.service} onChange={event => setAccount({ ...account, service: event.target.value })}><option value="">Sélectionner un service</option>{services.map(service => <option key={service.id_service} value={service.nom_service}>{service.nom_service}</option>)}</select>{servicesError && <small role="alert">{servicesError}</small>}{!services.length && !servicesError && <small>En attente des services disponibles.</small>}</label><label>Profil demandé<select value={account.role} onChange={event => setAccount({ ...account, role: event.target.value })}><option>Client</option><option>Dépositaire</option></select></label><label>Mot de passe<input required minLength="8" type="password" value={account.password} onChange={event => setAccount({ ...account, password: event.target.value })} /></label><label>Confirmer le mot de passe<input required type="password" value={account.confirm} onChange={event => setAccount({ ...account, confirm: event.target.value })} /></label></div>{account.confirm && account.password !== account.confirm && <p className="password-error">Les mots de passe ne correspondent pas.</p>}<button className="login-button" disabled={!account.service || Boolean(servicesError)}>Envoyer la demande d’inscription →</button></form>
}
