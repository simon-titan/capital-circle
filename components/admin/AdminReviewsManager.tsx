"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { Pencil, Plus, Star, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { uploadSmallFilePresigned } from "@/lib/admin-upload-presigned";
import {
  ADMIN_CARD_CLASS,
  AdminCardTitle,
  StatusPill,
  adminAlertIconColor,
  adminAlertProps,
  adminCardPadding,
  adminEmptyProps,
  adminFormLabelProps,
  adminInputProps,
  adminOptionStyle,
  adminRowProps,
  adminSwitchSx,
} from "@/components/admin/adminUi";

interface Review {
  id: string;
  name: string;
  rating: number;
  title: string;
  body: string;
  date_label: string;
  avatar_url: string | null;
  landing_slug: string;
  visible: boolean;
  sort_order: number;
  created_at: string;
}

const EMPTY_REVIEW: Omit<Review, "id" | "created_at"> = {
  name: "",
  rating: 5,
  title: "",
  body: "",
  date_label: "",
  avatar_url: null,
  landing_slug: "bewerbung",
  visible: true,
  sort_order: 0,
};

export function AdminReviewsManager() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSlug, setFilterSlug] = useState("bewerbung");

  const [editing, setEditing] = useState<Partial<Review> & typeof EMPTY_REVIEW | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reviews?landing=${filterSlug}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Fehler beim Laden");
      setReviews(json.items);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filterSlug]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const isNew = !("id" in editing) || !editing.id;
      const url = isNew ? "/api/admin/reviews" : `/api/admin/reviews/${editing.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(editing),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Fehler beim Speichern");
      setEditing(null);
      fetchReviews();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Review wirklich löschen?")) return;
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Fehler beim Löschen");
      fetchReviews();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleAvatarUpload(file: File) {
    if (!editing) return;
    setUploadingAvatar(true);
    try {
      const storageKey = await uploadSmallFilePresigned(file, {
        folder: "reviews",
        fileName: file.name,
        contentType: file.type,
      });
      const base = process.env.NEXT_PUBLIC_STORAGE_BASE_URL ?? "";
      const url = base ? `${base}/${storageKey}` : storageKey;
      setEditing({ ...editing, avatar_url: url });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingAvatar(false);
    }
  }

  return (
    <Stack spacing={6}>
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <HStack spacing={3}>
          <Select
            size="sm"
            w="180px"
            value={filterSlug}
            onChange={(e) => setFilterSlug(e.target.value)}
            {...adminInputProps}
          >
            <option value="bewerbung" style={adminOptionStyle}>Bewerbung</option>
            <option value="insight" style={adminOptionStyle}>Insight</option>
            <option value="global" style={adminOptionStyle}>Global</option>
          </Select>
          <Text className="cc-num" fontSize="sm" color="var(--cc-text-2)">
            {reviews.length} Reviews
          </Text>
        </HStack>
        <Button
          size="sm"
          variant="gold"
          leftIcon={<Plus size={14} />}
          onClick={() => setEditing({ ...EMPTY_REVIEW, landing_slug: filterSlug })}
        >
          Neues Review
        </Button>
      </HStack>

      {error && (
        <Alert status="error" {...adminAlertProps("error")}>
          <AlertIcon color={adminAlertIconColor("error")} />
          <Text fontSize="sm">{error}</Text>
        </Alert>
      )}

      {editing && (
        <Box className={ADMIN_CARD_CLASS} p={adminCardPadding}>
          <Stack spacing={4}>
            <AdminCardTitle as="h3">
              {editing.id ? "Review bearbeiten" : "Neues Review"}
            </AdminCardTitle>

            <HStack spacing={4} align="flex-start" flexWrap="wrap">
              <FormControl flex={1} minW="200px">
                <FormLabel {...adminFormLabelProps}>Name</FormLabel>
                <Input
                  size="sm"
                  {...adminInputProps}
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </FormControl>
              <FormControl w="100px">
                <FormLabel {...adminFormLabelProps}>Rating</FormLabel>
                <Select
                  size="sm"
                  {...adminInputProps}
                  value={editing.rating}
                  onChange={(e) => setEditing({ ...editing, rating: Number(e.target.value) })}
                >
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option key={r} value={r} style={adminOptionStyle}>{r} ★</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl w="140px">
                <FormLabel {...adminFormLabelProps}>Datum</FormLabel>
                <Input
                  size="sm"
                  {...adminInputProps}
                  value={editing.date_label}
                  onChange={(e) => setEditing({ ...editing, date_label: e.target.value })}
                  placeholder="z. B. März 2026"
                />
              </FormControl>
            </HStack>

            <FormControl>
              <FormLabel {...adminFormLabelProps}>Titel</FormLabel>
              <Input
                size="sm"
                {...adminInputProps}
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </FormControl>

            <FormControl>
              <FormLabel {...adminFormLabelProps}>Text</FormLabel>
              <Textarea
                size="sm"
                {...adminInputProps}
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                minH="100px"
              />
            </FormControl>

            <HStack spacing={4} align="flex-end" flexWrap="wrap">
              <FormControl flex={1} minW="200px">
                <FormLabel {...adminFormLabelProps}>
                  Avatar URL
                </FormLabel>
                <HStack>
                  <Input
                    size="sm"
                    {...adminInputProps}
                    value={editing.avatar_url ?? ""}
                    onChange={(e) => setEditing({ ...editing, avatar_url: e.target.value || null })}
                    placeholder="/client-pb/... oder Hetzner-URL"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAvatarUpload(file);
                    }}
                  />
                  <IconButton
                    aria-label="Avatar hochladen"
                    icon={<Upload size={14} />}
                    size="sm"
                    variant="line"
                    isLoading={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                  />
                </HStack>
              </FormControl>

              {editing.avatar_url && (
                <Box
                  as="img"
                  src={editing.avatar_url}
                  alt="Vorschau"
                  w="40px"
                  h="40px"
                  borderRadius="full"
                  objectFit="cover"
                  border="1px solid var(--cc-line-strong)"
                />
              )}
            </HStack>

            <HStack spacing={4} align="flex-end" flexWrap="wrap">
              <FormControl w="180px">
                <FormLabel {...adminFormLabelProps}>
                  Landing
                </FormLabel>
                <Select
                  size="sm"
                  {...adminInputProps}
                  value={editing.landing_slug}
                  onChange={(e) => setEditing({ ...editing, landing_slug: e.target.value })}
                >
                  <option value="bewerbung" style={adminOptionStyle}>Bewerbung</option>
                  <option value="insight" style={adminOptionStyle}>Insight</option>
                  <option value="global" style={adminOptionStyle}>Global</option>
                </Select>
              </FormControl>
              <FormControl w="100px">
                <FormLabel {...adminFormLabelProps}>
                  Sortierung
                </FormLabel>
                <Input
                  size="sm"
                  className="cc-num"
                  {...adminInputProps}
                  type="number"
                  value={editing.sort_order}
                  onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                />
              </FormControl>
              <FormControl w="auto" display="flex" alignItems="center" gap={2}>
                <Switch
                  isChecked={editing.visible}
                  onChange={(e) => setEditing({ ...editing, visible: e.target.checked })}
                  sx={adminSwitchSx}
                  size="sm"
                />
                <FormLabel fontSize="sm" color="var(--cc-text-2)" mb={0}>
                  Sichtbar
                </FormLabel>
              </FormControl>
            </HStack>

            <HStack spacing={3} pt={2}>
              <Button size="sm" variant="gold" onClick={handleSave} isLoading={saving}>
                Speichern
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(null)}
                color="var(--cc-text-2)"
                _hover={{ bg: "rgba(255, 255, 255, 0.04)", color: "var(--cc-text)" }}
              >
                Abbrechen
              </Button>
            </HStack>
          </Stack>
        </Box>
      )}

      {loading ? (
        <Text fontSize="sm" color="var(--cc-text-2)">Lade Reviews…</Text>
      ) : reviews.length === 0 ? (
        <Box {...adminEmptyProps}>Keine Reviews vorhanden.</Box>
      ) : (
        <Box className={ADMIN_CARD_CLASS} py={1}>
          <Stack spacing={0}>
            {reviews.map((review) => (
              <HStack key={review.id} px={4} py={3} spacing={3} align="center" {...adminRowProps}>
                {review.avatar_url ? (
                  <Box
                    as="img"
                    src={review.avatar_url}
                    alt={review.name}
                    w="36px"
                    h="36px"
                    borderRadius="full"
                    objectFit="cover"
                    flexShrink={0}
                    border="1px solid var(--cc-line-strong)"
                  />
                ) : (
                  <Box
                    w="36px"
                    h="36px"
                    borderRadius="full"
                    flexShrink={0}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    bg="rgba(255, 255, 255, 0.04)"
                    border="1px solid var(--cc-line-strong)"
                    color="var(--cc-text-soft)"
                    fontSize="12px"
                    fontWeight={600}
                  >
                    {review.name.charAt(0)}
                  </Box>
                )}

                <Stack spacing={0} flex={1} minW={0}>
                  <HStack spacing={2}>
                    <Text fontSize="sm" fontWeight={600} color="var(--cc-text)" noOfLines={1}>
                      {review.name}
                    </Text>
                    <HStack spacing={0.5} color="var(--cc-gold-light)">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} size={10} fill="currentColor" />
                      ))}
                    </HStack>
                    {!review.visible && <StatusPill tone="neutral">Verborgen</StatusPill>}
                  </HStack>
                  <Text fontSize="xs" color="var(--cc-text-2)" noOfLines={1}>
                    {review.title} — {review.date_label}
                  </Text>
                </Stack>

                <HStack spacing={1} flexShrink={0}>
                  <IconButton
                    aria-label="Bearbeiten"
                    icon={<Pencil size={14} />}
                    size="xs"
                    variant="ghost"
                    color="var(--cc-text-2)"
                    _hover={{ color: "var(--cc-gold-light)", bg: "rgba(255, 255, 255, 0.04)" }}
                    onClick={() => setEditing({ ...review })}
                  />
                  <IconButton
                    aria-label="Löschen"
                    icon={<Trash2 size={14} />}
                    size="xs"
                    variant="ghost"
                    color="var(--cc-text-3)"
                    _hover={{ color: "var(--cc-danger)", bg: "rgba(248, 113, 113, 0.08)" }}
                    onClick={() => handleDelete(review.id)}
                  />
                </HStack>
              </HStack>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
