import { prisma } from "@/lib/prisma";
import {
  getAlertPresentation,
  alertSortRank,
  type AlertLevel,
} from "@/utils/immigration-alerts";
import { documentTypeLabel, fullName, immigrationStatusLabel } from "@/utils/format";
import type { ImmigrationDocumentType, ImmigrationStatus } from "@prisma/client";

export async function listImmigrationDocuments(filters: {
  documentType?: ImmigrationDocumentType;
  alertLevel?: AlertLevel;
  immigrationStatus?: ImmigrationStatus;
  expiryFrom?: string;
  expiryTo?: string;
}) {
  const documents = await prisma.immigrationDocument.findMany({
    where: {
      documentType: filters.documentType,
      expiryDate: {
        gte: filters.expiryFrom ? new Date(filters.expiryFrom) : undefined,
        lte: filters.expiryTo ? new Date(filters.expiryTo) : undefined,
      },
      member: filters.immigrationStatus
        ? { immigrationStatus: { is: { status: filters.immigrationStatus } } }
        : undefined,
    },
    include: {
      member: {
        include: { immigrationStatus: true },
      },
    },
  });

  const rows = documents
    .map((doc) => {
      const alert = getAlertPresentation(doc.expiryDate);
      return {
        id: doc.id,
        memberId: doc.memberId,
        memberName: fullName(doc.member),
        immigrationStatus: doc.member.immigrationStatus?.status ?? null,
        immigrationStatusLabel: doc.member.immigrationStatus
          ? immigrationStatusLabel(doc.member.immigrationStatus.status)
          : "—",
        documentType: doc.documentType,
        documentLabel: documentTypeLabel(doc.documentType),
        expiryDate: doc.expiryDate,
        ...alert,
      };
    })
    .filter((row) => (filters.alertLevel ? row.level === filters.alertLevel : true))
    .sort((a, b) => {
      const rank = alertSortRank(a.level) - alertSortRank(b.level);
      if (rank !== 0) return rank;
      return a.expiryDate.getTime() - b.expiryDate.getTime();
    });

  return rows;
}

export async function listExpiringSoon(withinDays = 180, take = 8) {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() + withinDays);
  const documents = await prisma.immigrationDocument.findMany({
    where: {
      expiryDate: { lte: cutoff },
    },
    include: {
      member: { select: { id: true, firstName: true, lastName: true, active: true } },
    },
    orderBy: { expiryDate: "asc" },
    take: 50,
  });

  return documents
    .filter((doc) => doc.member.active)
    .map((doc) => ({
      ...getAlertPresentation(doc.expiryDate),
      id: doc.id,
      memberId: doc.memberId,
      memberName: fullName(doc.member),
      documentType: doc.documentType,
      documentLabel: documentTypeLabel(doc.documentType),
      expiryDate: doc.expiryDate,
    }))
    .filter((row) => row.level !== "VALID")
    .slice(0, take);
}
