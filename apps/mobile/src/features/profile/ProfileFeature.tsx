import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme/tokens';
import { useProfile } from './useProfile';
import { useAuth } from '../auth/useAuth';
import { UpgradeModal } from '../auth/UpgradeModal';
import { SocialAuthButtons } from '../auth/SocialAuthButtons';
import { getGameService } from '../../services';
import type { RemoteGameService } from '../../services/remote';

export function ProfileFeature() {
  const {
    displayName,
    title,
    earnedTitles,
    privacy,
    isAnonymous,
    email,
    isSaving,
    validationError,
    statusMessage,
    saveDisplayName,
    selectTitle,
    togglePrivacy,
    deleteAccount,
    migrateLocal,
  } = useProfile();

  const { sendUpgradeOtp, verifyUpgradeOtp, signOut } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(displayName);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);

  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AG';

  const handleSaveName = async () => {
    const success = await saveDisplayName(nameInput);
    if (success) {
      setIsEditingName(false);
    }
  };

  const handleMigrate = async () => {
    try {
      const service = getGameService() as RemoteGameService;
      if (typeof service.getApiClient === 'function') {
        await migrateLocal(service.getApiClient());
      }
    } catch {
      // Handled via validationError
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'DELETE DOSSIER',
      'This will permanently delete your bureau profile, solve history, and account credentials from all servers. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: async () => {
            const service = getGameService() as RemoteGameService;
            if (typeof service.getApiClient === 'function') {
              await deleteAccount(service.getApiClient());
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} allowFontScaling>
          INVESTIGATOR DOSSIER
        </Text>
        <Text style={styles.headerSubtitle} allowFontScaling>
          Bureau credentials and system identity
        </Text>
      </View>

      {/* Status Messages */}
      {statusMessage && (
        <View style={styles.statusBanner} testID="profile.banner.status">
          <Text style={styles.statusBannerText} allowFontScaling>
            {statusMessage}
          </Text>
        </View>
      )}

      {validationError && (
        <View style={styles.errorBanner} testID="profile.banner.error">
          <Text style={styles.errorBannerText} allowFontScaling>
            {validationError}
          </Text>
        </View>
      )}

      {/* Agent Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText} allowFontScaling>
            {initials}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.agentName} allowFontScaling>
            {displayName}
          </Text>
          <Text style={styles.agentBadge} allowFontScaling testID="profile.badge.title">
            RANK: {title.toUpperCase()} • BADGE #4409-NEON
          </Text>
          <Text style={styles.agentStation} allowFontScaling>
            {isAnonymous ? 'Temporary Field Operative' : email || 'Permanent Detective'}
          </Text>
        </View>
      </View>

      {/* Account Type & Upgrade Banner */}
      <View style={styles.card}>
        <Text style={styles.cardCategory} allowFontScaling>
          ACCOUNT STATUS
        </Text>
        {isAnonymous ? (
          <View style={styles.anonymousBox}>
            <Text style={styles.anonymousTitle} allowFontScaling>
              Anonymous Guest Session
            </Text>
            <Text style={styles.anonymousDesc} allowFontScaling>
              Your current case progress is stored locally on this device. Link a permanent email to safeguard your detective record across installations.
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => setUpgradeModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Upgrade to permanent email account"
              testID="profile.button.upgrade"
            >
              <Text style={styles.upgradeButtonText} allowFontScaling>
                LINK PERMANENT EMAIL
              </Text>
            </TouchableOpacity>
            <SocialAuthButtons />
          </View>
        ) : (
          <View style={styles.verifiedBox}>
            <Text style={styles.verifiedText} allowFontScaling>
              Verified Account: {email}
            </Text>
          </View>
        )}
      </View>

      {/* Edit Callsign / Display Name */}
      <View style={styles.card}>
        <Text style={styles.cardCategory} allowFontScaling>
          CALLSIGN &amp; IDENTITY
        </Text>
        {isEditingName ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Agent Name"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="words"
              accessibilityLabel="Edit display name"
              testID="profile.name.input"
            />
            <TouchableOpacity
              style={[styles.smallButton, styles.saveButton]}
              onPress={handleSaveName}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel="Save callsign"
              testID="profile.name.save"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={COLORS.bg} />
              ) : (
                <Text style={styles.saveButtonText} allowFontScaling>
                  SAVE
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallButton, styles.cancelButton]}
              onPress={() => {
                setNameInput(displayName);
                setIsEditingName(false);
              }}
              accessibilityRole="button"
              accessibilityLabel="Cancel editing name"
            >
              <Text style={styles.cancelButtonText} allowFontScaling>
                CANCEL
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.displayRow}>
            <Text style={styles.settingValue} allowFontScaling>
              {displayName}
            </Text>
            <TouchableOpacity
              style={styles.textButton}
              onPress={() => {
                setNameInput(displayName);
                setIsEditingName(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Edit callsign name"
              testID="profile.name.edit"
            >
              <Text style={styles.textButtonLabel} allowFontScaling>
                CHANGE
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Active Title Selection */}
      <View style={styles.card}>
        <Text style={styles.cardCategory} allowFontScaling>
          ACTIVE DETECTIVE TITLE
        </Text>
        <Text style={styles.cardHint} allowFontScaling>
          Display title visible on case leaderboards and peer challenges.
        </Text>
        <View style={styles.chipRow}>
          {earnedTitles.map((t) => {
            const isSelected = t === title;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => selectTitle(t)}
                accessibilityRole="button"
                accessibilityLabel={`Select title ${t}`}
                testID={`profile.title.select.${t}`}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]} allowFontScaling>
                  {t}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Privacy Toggles */}
      <View style={styles.card}>
        <Text style={styles.cardCategory} allowFontScaling>
          BUREAU PRIVACY PREFERENCES
        </Text>

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextCol}>
            <Text style={styles.toggleLabel} allowFontScaling>
              Public Detective Profile
            </Text>
            <Text style={styles.toggleDescription} allowFontScaling>
              Allows peers to view your rank and dossier stats.
            </Text>
          </View>
          <Switch
            value={privacy.publicProfile}
            onValueChange={() => togglePrivacy('publicProfile')}
            trackColor={{ false: COLORS.surfaceBorder, true: COLORS.accent }}
            thumbColor={privacy.publicProfile ? COLORS.bg : COLORS.muted}
            accessibilityLabel="Toggle public detective profile"
            testID="profile.privacy.toggle.publicProfile"
          />
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextCol}>
            <Text style={styles.toggleLabel} allowFontScaling>
              Anonymous Playtest Telemetry
            </Text>
            <Text style={styles.toggleDescription} allowFontScaling>
              Help calibrate puzzle fairness by reporting solve telemetry.
            </Text>
          </View>
          <Switch
            value={privacy.shareAnalytics}
            onValueChange={() => togglePrivacy('shareAnalytics')}
            trackColor={{ false: COLORS.surfaceBorder, true: COLORS.accent }}
            thumbColor={privacy.shareAnalytics ? COLORS.bg : COLORS.muted}
            accessibilityLabel="Toggle anonymous playtest telemetry"
            testID="profile.privacy.toggle.shareAnalytics"
          />
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextCol}>
            <Text style={styles.toggleLabel} allowFontScaling>
              Competitive Leaderboard
            </Text>
            <Text style={styles.toggleDescription} allowFontScaling>
              Display your callsign on weekly case solve leaderboards.
            </Text>
          </View>
          <Switch
            value={privacy.leaderboardVisible}
            onValueChange={() => togglePrivacy('leaderboardVisible')}
            trackColor={{ false: COLORS.surfaceBorder, true: COLORS.accent }}
            thumbColor={privacy.leaderboardVisible ? COLORS.bg : COLORS.muted}
            accessibilityLabel="Toggle competitive leaderboard visibility"
            testID="profile.privacy.toggle.leaderboardVisible"
          />
        </View>
      </View>

      {/* Cloud Migration */}
      <View style={styles.card}>
        <Text style={styles.cardCategory} allowFontScaling>
          LOCAL DOSSIER MIGRATION
        </Text>
        <Text style={styles.cardHint} allowFontScaling>
          Sync offline solves with the central bureau server to unlock historical archives.
        </Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleMigrate}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel="Migrate local case solves"
          testID="profile.button.migrate_local"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={COLORS.text} />
          ) : (
            <Text style={styles.actionButtonText} allowFontScaling>
              SYNC LOCAL SOLVES WITH BUREAU
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Account Actions */}
      <View style={styles.actionsCard}>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={signOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out of dossier"
          testID="profile.button.sign_out"
        >
          <Text style={styles.signOutButtonText} allowFontScaling>
            SIGN OUT
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
          accessibilityRole="button"
          accessibilityLabel="Permanently delete account"
          testID="profile.button.delete_account"
        >
          <Text style={styles.deleteButtonText} allowFontScaling>
            DELETE MY ACCOUNT &amp; RECORDS
          </Text>
        </TouchableOpacity>
      </View>

      {/* Upgrade Modal */}
      {upgradeModalVisible && (
        <UpgradeModal
          visible={upgradeModalVisible}
          onClose={() => setUpgradeModalVisible(false)}
          onSendOtp={sendUpgradeOtp}
          onVerifyOtp={verifyUpgradeOtp}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  header: {
    marginBottom: SPACING.xs,
  },
  headerTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    marginTop: SPACING.xs,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    borderRadius: 6,
    padding: SPACING.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.accent,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...TYPOGRAPHY.h2,
    color: COLORS.accent,
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  agentName: {
    ...TYPOGRAPHY.h2,
    fontSize: 18,
    color: COLORS.text,
  },
  agentBadge: {
    ...TYPOGRAPHY.monospace,
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '700',
  },
  agentStation: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    borderRadius: 6,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  cardCategory: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  cardHint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 12,
  },
  anonymousBox: {
    gap: SPACING.sm,
    backgroundColor: 'rgba(229, 169, 59, 0.08)',
    borderColor: 'rgba(229, 169, 59, 0.3)',
    borderWidth: 1,
    borderRadius: 6,
    padding: SPACING.sm,
  },
  anonymousTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.accent,
    fontSize: 14,
  },
  anonymousDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 18,
  },
  upgradeButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  upgradeButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.bg,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  verifiedBox: {
    paddingVertical: SPACING.xs,
  },
  verifiedText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontSize: 14,
  },
  displayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingValue: {
    ...TYPOGRAPHY.body,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  textButton: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
  },
  textButtonLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  nameInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
    color: COLORS.text,
    fontSize: 14,
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: COLORS.accent,
  },
  saveButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.bg,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: COLORS.surfaceBorder,
  },
  cancelButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  chip: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  chipSelected: {
    backgroundColor: 'rgba(229, 169, 59, 0.2)',
    borderColor: COLORS.accent,
  },
  chipText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 12,
  },
  chipTextSelected: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  toggleTextCol: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  toggleLabel: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    color: COLORS.text,
  },
  toggleDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  actionButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 12,
  },
  actionsCard: {
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  signOutButton: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  signOutButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  deleteButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  statusBanner: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    borderWidth: 1,
    borderRadius: 4,
    padding: SPACING.sm,
  },
  statusBannerText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: COLORS.danger,
    borderWidth: 1,
    borderRadius: 4,
    padding: SPACING.sm,
  },
  errorBannerText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
  },
});
