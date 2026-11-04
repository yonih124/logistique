import { config } from '@/config/env'
import { request } from './httpService'

const apiOrigin = config.apiOrigin

const roleLabels = {
  DEPOSITAIRE: 'Dépositaire',
  VALIDATEUR: 'Validateur',
  CLIENT: 'Client',
}

function normalizeIm(im) {
  const numericIm = Number(String(im).replace(/\D/g, ''))
  if (!Number.isInteger(numericIm) || numericIm <= 0) {
    throw new Error('Saisissez un numéro IM valide.')
  }
  return numericIm
}

export function mapUser(utilisateur) {
  return {
    ...utilisateur,
    im: String(utilisateur.id_utilisateur_im),
    name: utilisateur.nom_complet || 'Utilisateur',
    email: utilisateur.mail || '',
    service: utilisateur.service || utilisateur.Service?.nom_service || '',
    role: roleLabels[utilisateur.role] || utilisateur.role,
    avatar: utilisateur.photo_url ? new URL(utilisateur.photo_url, apiOrigin).href : '',
  }
}

export async function login(im, password) {
  const data = await request({
    url: '/auth/login',
    method: 'POST',
    data: { id_utilisateur_im: normalizeIm(im), mot_de_passe: password },
  })
  return mapUser(data.utilisateur)
}

export function register(account) {
  const roles = { Client: 'CLIENT', Dépositaire: 'DEPOSITAIRE' }
  return request({
    url: '/auth/register',
    method: 'POST',
    data: {
      id_utilisateur_im: normalizeIm(account.im),
      role: roles[account.role],
      nom_complet: account.name,
      mail: account.email,
      service: account.service,
      mot_de_passe: account.password,
      photo_profil: account.avatar || undefined,
    },
  })
}

export async function getCurrentUser() {
  return mapUser(await request({ url: '/auth/me' }))
}

export function logout() {
  return request({ url: '/auth/logout', method: 'POST' })
}

export async function updateProfilePhoto(photo) {
  const data = await request({ url: '/auth/photo', method: 'POST', data: { photo_profil: photo } })
  return mapUser(data.utilisateur)
}

export async function updateProfile(profile) {
  const data = await request({
    url: '/auth/profile',
    method: 'PATCH',
    data: { nom_complet: profile.name, mail: profile.email, service: profile.service },
  })
  return mapUser(data.utilisateur)
}

export function updatePassword(currentPassword, newPassword) {
  return request({
    url: '/auth/password',
    method: 'PATCH',
    data: { mot_de_passe_actuel: currentPassword, nouveau_mot_de_passe: newPassword },
  })
}
