package gorm

import (
	"fmt"
	"strings"
	"time"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// BuildEventRepository holds both EventContainer and SubEvent models
type BuildEventRepository struct {
	db *gorm.DB
}

// NewBuildEventRepository returns a BuildEventRepository which uses
// gorm.DB for querying the database
func NewBuildEventRepository(db *gorm.DB) repository.BuildEventRepository {
	return &BuildEventRepository{db}
}

func (repo BuildEventRepository) CreateEventContainer(am *models.EventContainer) (*models.EventContainer, error) {
	if err := repo.db.Create(am).Error; err != nil {
		return nil, err
	}
	return am, nil
}

func (repo BuildEventRepository) CreateSubEvent(am *models.SubEvent) (*models.SubEvent, error) {
	if err := repo.db.Create(am).Error; err != nil {
		return nil, err
	}
	return am, nil
}

func (repo BuildEventRepository) ReadEventsByContainerID(id uint) ([]*models.SubEvent, error) {
	var events []*models.SubEvent
	if err := repo.db.Where("event_container_id = ?", id).Find(&events).Error; err != nil {
		return nil, err
	}
	return events, nil
}

func (repo BuildEventRepository) ReadEventContainer(id uint) (*models.EventContainer, error) {
	container := &models.EventContainer{}
	if err := repo.db.Where("id = ?", id).First(&container).Error; err != nil {
		return nil, err
	}
	return container, nil
}

func (repo BuildEventRepository) ReadSubEvent(id uint) (*models.SubEvent, error) {
	event := &models.SubEvent{}
	if err := repo.db.Where("id = ?", id).First(&event).Error; err != nil {
		return nil, err
	}
	return event, nil
}

// AppendEvent will check if subevent with same (id, index) already exists
// if yes, overrite it, otherwise make a new subevent
func (repo BuildEventRepository) AppendEvent(container *models.EventContainer, event *models.SubEvent) error {
	event.EventContainerID = container.ID
	return repo.db.Create(event).Error
}

// KubeEventRepository uses gorm.DB for querying the database
type KubeEventRepository struct {
	db  *gorm.DB
	key *[32]byte
}

// NewKubeEventRepository returns an KubeEventRepository which uses
// gorm.DB for querying the database. It accepts an encryption key to encrypt
// sensitive data
func NewKubeEventRepository(db *gorm.DB, key *[32]byte) repository.KubeEventRepository {
	return &KubeEventRepository{db, key}
}

// CreateEvent creates a new kube auth mechanism
func (repo *KubeEventRepository) CreateEvent(
	event *models.KubeEvent,
) (*models.KubeEvent, error) {
	err := repo.db.Transaction(func(tx *gorm.DB) error {
		// read the count of the events in the DB
		query := tx.Debug().Where("project_id = ? AND cluster_id = ?", event.ProjectID, event.ClusterID)

		var count int64

		if err := query.Model([]*models.KubeEvent{}).Count(&count).Error; err != nil {
			return err
		}

		fmt.Println("COUNT IS", event.Name, count)

		// if the count is greater than 500, remove the lowest-order event to implement a
		// basic fixed-length buffer
		if count >= 500 {
			// find the id of the first match
			matchedEvent := &models.KubeEvent{}

			if err := query.Order("updated_at asc").Order("id asc").First(matchedEvent).Error; err != nil {
				return err
			}

			err := tx.Debug().Transaction(func(tx2 *gorm.DB) error {
				return deleteEventPermanently(matchedEvent.ID, tx2)
			})

			if err != nil {
				return err
			}
		}

		if err := tx.Debug().Create(event).Error; err != nil {
			return err
		}

		return nil
	})

	return event, err
}

// ReadEvent finds an event by id
func (repo *KubeEventRepository) ReadEvent(
	id, projID, clusterID uint,
) (*models.KubeEvent, error) {
	event := &models.KubeEvent{}

	if err := repo.db.Preload("SubEvents").Where(
		"id = ? AND project_id = ? AND cluster_id = ?",
		id,
		projID,
		clusterID,
	).First(&event).Error; err != nil {
		return nil, err
	}

	return event, nil
}

// ReadEventByGroup finds an event by a set of options which group events together
func (repo *KubeEventRepository) ReadEventByGroup(
	projID uint,
	clusterID uint,
	opts *types.GroupOptions,
) (*models.KubeEvent, error) {
	event := &models.KubeEvent{}

	query := repo.db.Preload("SubEvents").
		Where("project_id = ? AND cluster_id = ? AND name = ? AND LOWER(resource_type) = LOWER(?)", projID, clusterID, opts.Name, opts.ResourceType)

	// construct query for timestamp
	query = query.Where(
		"updated_at >= ?", opts.ThresholdTime,
	)

	if opts.Namespace != "" {
		query = query.Where(
			"namespace = ?",
			strings.ToLower(opts.Namespace),
		)
	}

	if err := query.First(&event).Error; err != nil {
		return nil, err
	}

	return event, nil
}

// ListEventsByProjectID finds all events for a given project id
// with the given options
func (repo *KubeEventRepository) ListEventsByProjectID(
	projectID uint,
	clusterID uint,
	opts *types.ListKubeEventRequest,
) ([]*models.KubeEvent, int64, error) {
	listOpts := opts

	if listOpts.Limit == 0 {
		listOpts.Limit = 50
	}

	events := []*models.KubeEvent{}

	// preload the subevents
	query := repo.db.Preload("SubEvents").Where("project_id = ? AND cluster_id = ?", projectID, clusterID)

	if listOpts.OwnerName != "" && listOpts.OwnerType != "" {
		query = query.Where(
			"LOWER(owner_name) = LOWER(?) AND LOWER(owner_type) = LOWER(?)",
			listOpts.OwnerName,
			listOpts.OwnerType,
		)
	}

	if listOpts.ResourceType != "" {
		query = query.Where(
			"LOWER(resource_type) = LOWER(?)",
			listOpts.ResourceType,
		)
	}

	// get the count before limit and offset
	var count int64

	if err := query.Model([]*models.KubeEvent{}).Count(&count).Error; err != nil {
		return nil, 0, err
	}

	query = query.Order("updated_at desc").Order("id desc").Limit(listOpts.Limit).Offset(listOpts.Skip)

	if err := query.Find(&events).Error; err != nil {
		return nil, 0, err
	}

	return events, count, nil
}

// AppendSubEvent will add a subevent to an existing event
func (repo *KubeEventRepository) AppendSubEvent(event *models.KubeEvent, subEvent *models.KubeSubEvent) error {
	subEvent.KubeEventID = event.ID

	return repo.db.Transaction(func(tx *gorm.DB) error {
		var count int64

		query := tx.Debug().Where("kube_event_id = ?", event.ID)

		if err := query.Model([]*models.KubeSubEvent{}).Count(&count).Error; err != nil {
			return err
		}

		fmt.Println("COUNT IS", event.Name, count)

		// if the count is greater than 20, remove the lowest-order event to implement a
		// basic fixed-length buffer
		if count >= 20 {
			// find the id of the first match
			matchedEvent := &models.KubeSubEvent{}

			if err := query.Order("updated_at asc").Order("id asc").First(matchedEvent).Error; err != nil {
				return err
			}

			if err := query.Unscoped().Delete(matchedEvent).Error; err != nil {
				return err
			}
		}

		if err := tx.Create(subEvent).Error; err != nil {
			return err
		}

		event.UpdatedAt = time.Now()

		return tx.Save(event).Error
	})
}

// DeleteEvent deletes an event by ID
func (repo *KubeEventRepository) DeleteEvent(
	id uint,
) error {
	return repo.db.Transaction(func(tx *gorm.DB) error {
		return deleteEventPermanently(id, tx)
	})
}

func deleteEventPermanently(id uint, tx *gorm.DB) error {
	// delete all subevents first
	if err := tx.Debug().Unscoped().Where("kube_event_id = ?", id).Delete(&models.KubeSubEvent{}).Error; err != nil {
		return err
	}

	// delete event
	return tx.Debug().Preload("SubEvents").Unscoped().Where("id = ?", id).Delete(&models.KubeEvent{}).Error
}
