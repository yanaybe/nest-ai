import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { SettingsContent } from '@/components/settings/settings-content'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const member = await db.householdMember.findFirst({
    where: { userId: user.id },
    include: { household: { include: { members: true } } },
  })
  if (!member) redirect('/onboarding')

  return (
    <SettingsContent
      member={member}
      household={member.household}
      members={member.household.members}
    />
  )
}
