"use client";

import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Heading,
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

const inputSx = {
  bg: "rgba(255,255,255,0.04)",
  borderColor: "rgba(255,255,255,0.12)",
  _hover: { borderColor: "rgba(212,175,55,0.4)" },
  _focus: { borderColor: "rgba(212,175,55,0.6)", boxShadow: "0 0 0 1px rgba(212,175,55,0.4)" },
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
            sx={inputSx}
          >
            <option value="bewerbung">Bewerbung</option>
            <option value="insight">Insight</option>
            <option value="global">Global</option>
          </Select>
          <Text fontSize="sm" color="var(--color-text-secondary)" className="inter">
            {reviews.length} Reviews
          </Text>
        </HStack>
        <Button
          size="sm"
          leftIcon={<Plus size={14} />}
          onClick={() => setEditing({ ...EMPTY_REVIEW, landing_slug: filterSlug })}
          bg="rgba(212,175,55,0.15)"
          color="var(--color-accent-gold)"
          borderColor="rgba(212,175,55,0.3)"
          borderWidth="1px"
          _hover={{ bg: "rgba(212,175,55,0.25)" }}
          className="inter-semibold"
        >
          Neues Review
        </Button>
      </HStack>

      {error && (
        <Alert status="error" variant="subtle" bg="rgba(229,72,77,0.10)" borderRadius="12px">
          <AlertIcon />
          <Text fontSize="sm" className="inter">{error}</Text>
        </Alert>
      )}

      {editing && (
        <Box
          p={5}
          borderRadius="16px"
          bg="rgba(255,255,255,0.04)"
          border="1px solid rgba(212,175,55,0.25)"
        >
          <Stack spacing={4}>
            <Heading as="h3" size="sm" className="inter-semibold" color="var(--color-text-primary)">
              {editing.id ? "Review bearbeiten" : "Neues Review"}
            </Heading>

            <HStack spacing={4} align="flex-start" flexWrap="wrap">
              <FormControl flex={1} minW="200px">
                <FormLabel fontSize="xs" className="inter-semibold" color="rgba(255,255,255,0.6)">Name</FormLabel>
                <Input
                  size="sm"
                  sx={inputSx}
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </FormControl>
              <FormControl w="100px">
                <FormLabel fontSize="xs" className="inter-semibold" color="rgba(255,255,255,0.6)">Rating</FormLabel>
                <Select
                  size="sm"
                  sx={inputSx}
                  value={editing.rating}
                  onChange={(e) => setEditing({ ...editing, rating: Number(e.target.value) })}
                >
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option key={r} value={r}>{r} ★</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl w="140px">
                <FormLabel fontSize="xs" className="inter-semibold" color="rgba(255,255,255,0.6)">Datum</FormLabel>
                <Input
                  size="sm"
                  sx={inputSx}
                  value={editing.date_label}
                  onChange={(e) => setEditing({ ...editing, date_label: e.target.value })}
                  placeholder="z. B. März 2026"
                />
              </FormControl>
            </HStack>

            <FormControl>
              <FormLabel fontSize="xs" className="inter-semibold" color="rgba(255,255,255,0.6)">Titel</FormLabel>
              <Input
                size="sm"
                sx={inputSx}
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="xs" className="inter-semibold" color="rgba(255,255,255,0.6)">Text</FormLabel>
              <Textarea
                size="sm"
                sx={inputSx}
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                minH="100px"
              />
            </FormControl>

            <HStack spacing={4} align="flex-end" flexWrap="wrap">
              <FormControl flex={1} minW="200px">
                <FormLabel fontSize="xs" className="inter-semibold" color="rgba(255,255,255,0.6)">
                  Avatar URL
                </FormLabel>
                <HStack>
                  <Input
                    size="sm"
                    sx={inputSx}
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
                    isLoading={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    bg="rgba(255,255,255,0.06)"
                    borderWidth="1px"
                    borderColor="rgba(255,255,255,0.12)"
                    _hover={{ bg: "rgba(255,255,255,0.10)" }}
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
                  border="1px solid rgba(212,175,55,0.3)"
                />
              )}
            </HStack>

            <HStack spacing={4} align="flex-end" flexWrap="wrap">
              <FormControl w="180px">
                <FormLabel fontSize="xs" className="inter-semibold" color="rgba(255,255,255,0.6)">
                  Landing
                </FormLabel>
                <Select
                  size="sm"
                  sx={inputSx}
                  value={editing.landing_slug}
                  onChange={(e) => setEditing({ ...editing, landing_slug: e.target.value })}
                >
                  <option value="bewerbung">Bewerbung</option>
                  <option value="insight">Insight</option>
                  <option value="global">Global</option>
                </Select>
              </FormControl>
              <FormControl w="100px">
                <FormLabel fontSize="xs" className="inter-semibold" color="rgba(255,255,255,0.6)">
                  Sortierung
                </FormLabel>
                <Input
                  size="sm"
                  sx={inputSx}
                  type="number"
                  value={editing.sort_order}
                  onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                />
              </FormControl>
              <FormControl w="auto" display="flex" alignItems="center" gap={2}>
                <Switch
                  isChecked={editing.visible}
                  onChange={(e) => setEditing({ ...editing, visible: e.target.checked })}
                  colorScheme="yellow"
                  size="sm"
                />
                <FormLabel fontSize="xs" className="inter" color="rgba(255,255,255,0.5)" mb={0}>
                  Sichtbar
                </FormLabel>
              </FormControl>
            </HStack>

            <HStack spacing={3} pt={2}>
              <Button
                size="sm"
                onClick={handleSave}
                isLoading={saving}
                bg="rgba(212,175,55,0.2)"
                color="var(--color-accent-gold)"
                borderColor="rgba(212,175,55,0.4)"
                borderWidth="1px"
                _hover={{ bg: "rgba(212,175,55,0.35)" }}
                className="inter-semibold"
              >
                Speichern
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(null)}
                color="rgba(255,255,255,0.5)"
                _hover={{ bg: "rgba(255,255,255,0.06)" }}
                className="inter"
              >
                Abbrechen
              </Button>
            </HStack>
          </Stack>
        </Box>
      )}

      {loading ? (
        <Text fontSize="sm" color="var(--color-text-secondary)" className="inter">Lade Reviews…</Text>
      ) : reviews.length === 0 ? (
        <Text fontSize="sm" color="var(--color-text-secondary)" className="inter">Keine Reviews vorhanden.</Text>
      ) : (
        <Stack spacing={0}>
          {reviews.map((review) => (
            <HStack
              key={review.id}
              px={4}
              py={3}
              borderBottom="1px solid rgba(255,255,255,0.06)"
              _hover={{ bg: "rgba(255,255,255,0.02)" }}
              spacing={3}
              align="center"
            >
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
                  border="1px solid rgba(212,175,55,0.25)"
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
                  bg="rgba(212,175,55,0.12)"
                  border="1px solid rgba(212,175,55,0.25)"
                  color="var(--color-accent-gold)"
                  fontSize="12px"
                  className="inter-semibold"
                >
                  {review.name.charAt(0)}
                </Box>
              )}

              <Stack spacing={0} flex={1} minW={0}>
                <HStack spacing={2}>
                  <Text fontSize="sm" className="inter-semibold" color="var(--color-text-primary)" noOfLines={1}>
                    {review.name}
                  </Text>
                  <HStack spacing={0.5}>
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} size={10} fill="#D4AF37" color="#D4AF37" />
                    ))}
                  </HStack>
                  {!review.visible && (
                    <Badge fontSize="9px" colorScheme="red" variant="subtle">Verborgen</Badge>
                  )}
                </HStack>
                <Text fontSize="xs" color="rgba(255,255,255,0.45)" className="inter" noOfLines={1}>
                  {review.title} — {review.date_label}
                </Text>
              </Stack>

              <HStack spacing={1} flexShrink={0}>
                <IconButton
                  aria-label="Bearbeiten"
                  icon={<Pencil size={14} />}
                  size="xs"
                  variant="ghost"
                  color="rgba(255,255,255,0.5)"
                  _hover={{ color: "var(--color-accent-gold)", bg: "rgba(255,255,255,0.06)" }}
                  onClick={() => setEditing({ ...review })}
                />
                <IconButton
                  aria-label="Löschen"
                  icon={<Trash2 size={14} />}
                  size="xs"
                  variant="ghost"
                  color="rgba(255,255,255,0.35)"
                  _hover={{ color: "red.300", bg: "rgba(229,72,77,0.10)" }}
                  onClick={() => handleDelete(review.id)}
                />
              </HStack>
            </HStack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
